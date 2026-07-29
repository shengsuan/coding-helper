# 配置文件迁移 + 加密 + auth 命令

## Context

当前 `~/.coding-helper/config.json` 存放在用户主目录，且为明文 JSON，其中包含各 Plan 的
API Key。用户希望：
1. 把配置文件移动到可执行文件所在目录（而不是主目录）。
2. 配置文件内容加密存储，密钥落在操作系统原生安全存储中：macOS Keychain、Windows Credential
   Manager、Linux Secret Service（libsecret）。
3. 新增 `-a/--auth/auth` 命令族，支持设置密码、修改密码、删除密码。

采用 `github.com/99designs/keyring` 统一封装三个平台的密钥库访问（对应
`KeychainBackend`/`WinCredBackend`/`SecretServiceBackend`），不引入它的 `file`/`pass`
兜底后端，以确保密钥确实落在系统级安全存储里。

默认行为（已与用户确认）：
- 首次运行自动生成随机密钥，存入系统密钥库，全程对用户透明加密 `config.json`，无需用户输入密码。
- `auth set/change [password]` 允许用户用自定义密码替换当前密钥（不传参数时交互式隐藏输入两次确认）。
- `auth delete` 会先用当前密钥解密还原为明文文件，再从密钥库删除该条目（数据不丢失，之后运行不再加密，
  除非用户重新 `auth set`）。

## 加密方案

- 对称加密：AES-256-GCM。
- 密钥派生：`crypto/pbkdf2`（Go 1.24+ 标准库，当前 `go.mod` 是 1.26，可直接用）对存放在密钥库里的
  “secret”（随机生成的 32 字节值的 base64，或用户设置的密码）做 PBKDF2（SHA-256，100000 次迭代）得到
  32 字节 AES key。PBKDF2 的 salt（16 字节随机）不是秘密，随加密内容一起以明文形式存于文件头。
- 文件格式（`config.json` 内容，文件名不变，但内容按需为二进制或 JSON）：
  - 加密时：`"CHENC1"`（6 字节 magic）+ `salt`（16 字节）+ `nonce‖ciphertext`（AES-GCM 输出）。
  - 未加密时：普通 JSON 文本（兼容旧文件、以及 `auth delete` 之后的状态）。
  - 加载时先看文件开头是否等于 magic 来判定模式，避免额外的状态文件。

## 密钥库封装（新文件 `internal/app/vault.go`）

```go
const vaultService = "coding-helper"
const vaultSecretKey = "config-secret"

func openVault() (keyring.Keyring, error) {
    return keyring.Open(keyring.Config{
        ServiceName:     vaultService,
        AllowedBackends: []keyring.BackendType{keyring.KeychainBackend, keyring.WinCredBackend, keyring.SecretServiceBackend},
    })
}
func vaultGetSecret() (string, error)         // 包装 kr.Get，ErrKeyNotFound 单独判断
func vaultSetSecret(secret string) error      // 包装 kr.Set
func vaultDeleteSecret() error                // 包装 kr.Remove，忽略 ErrKeyNotFound
```

`openVault()` 失败（三种后端都不可用，比如 Linux 没有跑 secret-service/gnome-keyring）时，返回的错误要
在 `NewSettings`/`Save` 里包一层清晰提示：“无法访问系统密钥库（Keychain/凭据管理器/Secret Service），
请确认其已启用后重试”。这是有意的限制（不做 file/pass 兜底），需要在 README 里说明。

## 加解密辅助（并入 `internal/app/settings.go`）

```go
func deriveKey(secret string, salt []byte) []byte  // pbkdf2.Key(sha256.New, secret, salt, 100000, 32)
func encryptJSON(secret string, salt, plaintext []byte) ([]byte, error) // AES-GCM Seal，返回 nonce+ciphertext
func decryptJSON(secret string, salt, sealed []byte) ([]byte, error)    // AES-GCM Open
```

## `Settings` 结构与加载/保存逻辑调整（`internal/app/settings.go`）

- 新增字段：`encrypted bool`、`salt []byte`。
- `NewSettings(configDir, home string) (*Settings, error)`：
  - `path = filepath.Join(configDir, "config.json")`（不再拼 `~/.coding-helper`）。
  - 文件不存在 → `data` 用默认值，`encrypted = true`（默认加密开启），`salt = nil`（留给 `Save` 首次
    写入时生成，同时首次生成随机 secret 写入密钥库）。
  - 文件存在：
    - 以 magic 前缀判断：命中 → 解析出 `salt` 和密文，`vaultGetSecret()` 取密钥，`decryptJSON` 还原
      JSON，`encrypted = true`。取密钥失败（密钥库里没有/无法访问）直接返回错误，提示用户
      `auth delete` 或检查密钥库。
    - 未命中（普通 JSON）→ 按旧逻辑 `json.Unmarshal`，`encrypted = false`。
  - 其余字段默认值合并逻辑（`Lang`/`Plans`/`patch()`）不变。
- `Save() error`：
  - `patch()` 后 `json.MarshalIndent`。
  - `encrypted == false` → 原样写明文（兼容旧行为）。
  - `encrypted == true` → 若 `s.salt == nil` 生成随机 16 字节；若密钥库里没有 secret（`vaultGetSecret`
    返回 `ErrKeyNotFound`），生成 32 字节随机值（`crypto/rand`，base64 编码）并 `vaultSetSecret`；
    用取到的 secret + salt `encryptJSON`，拼 `magic+salt+sealed` 写入文件。
- 新增方法（供 `auth` 命令调用）：
  - `IsEncrypted() bool`
  - `SetPassword(password string) error`：`password==""` 时不做交互（交互放在 `app.go`，见下），否则
    生成新 salt、`vaultSetSecret(password)`、`s.encrypted = true`、调用 `Save()` 用新密钥重新落盘（内存
    中的 `s.data` 已经是加载时解密好的最新数据，不需要重新读旧密钥）。
  - `RemovePassword() error`：若 `!s.encrypted` 返回“当前未启用加密”的错误；否则 `s.encrypted = false`、
    `vaultDeleteSecret()`（忽略未找到错误）、`Save()` 落盘明文。

## CLI 改动（`internal/app/app.go`）

- `Run()`：用 `os.Executable()` + `filepath.EvalSymlinks` 得到可执行文件真实路径，`filepath.Dir(...)`
  作为 `configDir` 传给 `NewSettings(configDir, home)`（`home` 继续只用于工具集成路径）。
- `run()` 增加分支：`case "-a", "--auth", "auth": return a.auth(args[1:])`。
- 新增 `func (a *Application) auth(args []string) error`：
  - 无参数或 `status`：打印“加密状态：已加密/未加密”、配置文件路径。
  - `set`/`change`：`password := ""`；若 `len(args)>1` 取 `args[1]`；否则调用两次
    `keyring.TerminalPrompt("请输入新密码")` 隐藏输入，两次不一致报错；再调用
    `a.settings.SetPassword(password)`；成功打印“✓ 已设置密码”。
  - `delete`/`del`/`remove`：调用 `a.settings.RemovePassword()`；成功打印“✓ 已删除密码，配置已还原为明文”。
  - 其他：报未知子命令。
- `help()` 文本追加 `-a, --auth, auth` 相关说明（`auth`/`auth set [password]`/`auth change [password]`/
  `auth delete`）。

## 依赖与构建

- `go get github.com/99designs/keyring && go mod tidy`，新增间接依赖
  `godbus/dbus`、`gsterjov/go-libsecret`、`99designs/go-keychain`、`danieljoos/wincred`、
  `golang.org/x/sys`、`golang.org/x/term`、`mtibben/percent`、`dvsekhvalnov/jose2go`。
- **重要构建限制**：macOS 的 Keychain 后端（`go-keychain`）通过 cgo 调用 Security.framework，
  必须 `CGO_ENABLED=1` 才会被编译进二进制；Windows/Linux 后端是纯 Go，不受影响。当前
  `.github/workflows/release.yml` 的 macOS 矩阵条目（`macos-amd64`、`macos-arm64`，都跑在
  `runner: macos-latest`）需要显式设置 `CGO_ENABLED: 1`，否则跨架构构建时 Go 默认会把 CGO 关掉，
  导致该二进制里 Keychain 分支被排除、`AvailableBackends()` 在 mac 上就查不到 Keychain。需要在
  `release.yml` 里给这两个 job 的构建 step 加 `CGO_ENABLED: 1`（Linux/Windows 矩阵条目保持现状）。
- 本地 `go build`/`go vet` 在本机（macOS, cgo 可用）应能直接验证 Keychain 路径可编译。

## README 更新

- “配置”章节说明：配置文件现位于可执行文件同目录下的 `config.json`，默认使用 AES-256-GCM 加密，
  密钥存放在系统密钥库（macOS Keychain / Windows Credential Manager / Linux Secret Service），并说明
  Linux 上需要有可用的 Secret Service 实现（如 gnome-keyring）。
- 新增 “密码管理 / auth” 命令小节，列出 `auth`、`auth set [password]`、`auth change [password]`、
  `auth delete`。

## 验证方式与已知限制

- `go build ./...`、`go vet ./...`（本机 macOS，cgo 默认开启）。
- 手工验证（在本机终端，非当前 sandbox 环境，因为 macOS Keychain 首次访问通常会弹出系统授权对话框，
  在当前工具的非交互 shell 里可能卡住或直接报错无法访问）：
  1. 删除旧的 `~/.coding-helper` 目录（不再使用），在新编译的二进制同目录下运行任意会触发 `Save()`
     的命令（如 `cfg add ...`），确认 `config.json` 生成在可执行文件目录下且内容是二进制（不是明文
     JSON），并确认系统密钥库（如 macOS “钥匙串访问.app”）里出现 `coding-helper` / `config-secret`
     条目。
  2. `auth status` 显示“已加密”。
  3. `auth set mypassword`、重新运行任意读取配置的命令，确认仍能正确解密（新密钥替换旧密钥后数据不丢）。
  4. `auth delete`，确认 `config.json` 变回明文 JSON，且钥匙串条目被移除；`auth status` 显示“未加密”。
  5. 再次 `auth set` 恢复加密，确认往返正常。
- 在当前 sandbox 里只做到 `go build`/`go vet` 通过 + 代码走读级别的自检；涉及真实系统密钥库交互授权
  的步骤，需要用户在自己终端里手动跑一遍确认（会在实现后如实说明这一限制）。
