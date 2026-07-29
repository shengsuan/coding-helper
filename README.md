# Coding Helper

一键配置 [胜算云](https://shengsuanyun.com/) Coding Plan API 凭证到多款 AI 编程工具的跨平台 CLI。

Coding Helper is a cross-platform CLI for configuring [ShengSuanYun](https://shengsuanyun.com/) Coding Plan API credentials across AI coding tools.

## 支持的工具 / Supported tools

| 工具 / Tool | 说明 / Description | 配置路径 / Config path |
| --- | --- | --- |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Anthropic AI 编程助手 | `~/.claude/settings.json` |
| [OpenCode](https://github.com/opencode-ai/opencode) | 开源 AI 编程工具 | `~/.config/opencode/opencode.json` |
| [OpenClaw](https://github.com/openclaw/openclaw) | AI 编程网关 | `~/.openclaw/openclaw.json` |
| [PicoClaw](https://github.com/sipeed/picoclaw) | AI 编程网关 | `~/.picoclaw/config.json` |
| [Codex](https://github.com/openai/codex) | AI 编程助手 | `~/.codex/config.toml` |
| [Aider](https://github.com/Aider-AI/aider) | AI 结对编程工具 | `~/.aider.conf.yml` |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | AI Agent | `~/.hermes/config.yaml` |
| [DeepSeek TUI](https://github.com/Hmbown/DeepSeek-TUI) | 终端 AI 助手 | `~/.deepseek/config.toml` |
| [OpenCodeReview](https://github.com/alibaba-group/open-code-review) | AI 代码评审工具 | `~/.opencodereview/config.json` |
| [Grok Build](https://github.com/xai-org/grok-build) | AI 编程工具 | `~/.grok/config.toml` |

## 支持的方案 / Supported plans

| 方案 / Plan | 标识 / ID | 默认 API 端点 |
| --- | --- | --- |
| 按量付费 / Pay as You Go | `pay_as_you_go` | `https://router.shengsuanyun.com/api/v1` |

模型会通过套餐端点的 `/models` 接口查询，并依据目标工具所需 API 自动校验。

## 安装 / Installation

### npm

已发布版本可继续使用原有安装命令：

```bash
npm install -g @coohu/coding-helper
```

npm 包包含 Linux amd64、macOS amd64、macOS arm64 和 Windows amd64 二进制，并在运行时自动选择当前平台的版本。安装 npm 包需要 Node.js 18 或更高版本。

### GitHub Release

从 [GitHub Releases](https://github.com/shengsuan/coding-helper/releases) 下载与系统匹配的二进制文件，添加执行权限后运行：

```bash
chmod +x coding-helper-linux-amd64
./coding-helper-linux-amd64 --help
```

### 从源码安装 / From source

开发和源码构建需要 Go 1.26 或更高版本：

```bash
go install ./cmd/coding-helper
coding-helper --help
```

也可以直接构建：

```bash
go build -o coding-helper ./cmd/coding-helper
./coding-helper --help
```

## 快速开始 / Quick start

先为套餐添加 API Key：

```bash
coding-helper cfg key add pay_as_you_go --key <api-key> --label h1
```

再将套餐（及可选指定标签的 Key）应用到工具：

```bash
coding-helper set codex pay_as_you_go
coding-helper set codex pay_as_you_go h1
```

`set` 会检查目标工具是否已安装；若未安装，会执行该工具对应的安装命令。随后会查询可用模型，校验 API 兼容性，并写入工具配置。

运行不带参数的命令可查看 Plan 列表和 Tool 列表：

```bash
coding-helper
```

## 命令 / Commands

### 总览与帮助 / Overview and help

```bash
coding-helper                 # 显示 Plan 列表、Tool 列表及帮助提示
coding-helper -h               # 或 --help / help
coding-helper -v               # 或 --version / version
coding-helper -s               # 或 --show / show，显示 Plan + Tool 列表
coding-helper -s plan          # 只显示 Plan 列表
coding-helper -s tool          # 只显示 Tool 列表
```

### Plan 管理 / Plan management

```bash
coding-helper cfg                  # 或 -c / --cfg，列出所有 Plan
coding-helper cfg show <plan>      # 显示 Plan 详情（含 API Key 列表）
coding-helper cfg add <plan> --base-url URL [--label L] [--model M]
coding-helper cfg edit <plan> [--label L] [--base-url URL] [--model M]
coding-helper cfg del <plan>

coding-helper cfg key add <plan> --key K [--label L]
coding-helper cfg key edit <plan> --key K [--new-key NK] [--label L]
coding-helper cfg key del <plan> --key K
coding-helper cfg key del <plan> --label L
```

未指定 `--label` 时，`cfg add` 会随机生成一个标签；`--model` 也是可选项。

Tool 列表内置于程序中，不可通过 `cfg` 增删改，仅可通过 `show`/`cfg` 查询展示。

### 配置工具 / Apply to tools

```bash
coding-helper set <tool> <plan> [key_label]   # 将 Plan（及可选指定标签的 Key）写入工具自身配置文件
coding-helper set <tool> del                  # 清除工具自身配置文件中由本程序写入的字段
```

未指定 `key_label` 时，使用该 Plan 的第一个 API Key。

### 快捷设置 / Quick setup

为工具配置一个 Plan 中还没有的 baseurl/apikey；命令会在完成工具配置文件写入的同时，把新的 API Key 保存进 Plan（若 base_url 命中已有 Plan 则追加 Key，否则自动创建新 Plan）：

```bash
coding-helper set quick <tool> --base-url URL --api-key KEY [--label LABEL] [--model MODEL]
```

## 配置 / Configuration

主配置文件为可执行文件同目录下的 `config.json`，其中保存语言设置、Plan（含多个 API Key）以及内置的
Tool 列表。文件以仅当前用户可读写的权限创建。

配置文件默认使用 AES-256-GCM 加密存储，加密密钥保存在操作系统原生安全存储中：macOS Keychain、
Windows Credential Manager、Linux Secret Service（libsecret，如 gnome-keyring）。首次运行会自动生成
随机密钥并写入系统密钥库，全程对用户透明，无需手动输入密码。Linux 上需要有可用的 Secret Service
实现，否则无法读写配置文件。

Coding Helper 会保留工具配置中的其他字段，只更新它管理的连接、模型和认证字段。请妥善保管 API Key，避免将本地配置文件提交到版本控制系统。

### 密码管理 / auth

```bash
coding-helper -a                  # 或 --auth / auth，显示配置文件加密状态
coding-helper auth set [password]     # 设置/启用自定义密码（不提供参数时交互式隐藏输入两次确认）
coding-helper auth change [password]  # 修改密码，用法同 set
coding-helper auth delete             # 删除密码，配置文件还原为明文
```

## 开发 / Development

```bash
go test ./...
go vet ./...
make build
```

## 许可证 / License

MIT
