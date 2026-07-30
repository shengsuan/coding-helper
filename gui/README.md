# Coding Helper GUI

Coding Helper GUI 是 [Coding Helper](../README.md) 的 Tauri 桌面界面。它**不内置也不打包** CLI 核心、Go 二进制或 Node 运行时：GUI 通过调用已安装的 `coding-helper` 可执行文件工作。

这意味着用户只需下载一次 CLI，随后可自由选择终端或 GUI；两者使用同一份配置、同一组 API Key 和同一套工具适配逻辑。

## 使用

1. 先安装 CLI：

   ```bash
   npm install -g @coohu/coding-helper
   # 或下载 GitHub Release 的 coding-helper 二进制
   ```

2. 安装并启动 GUI：

   ```bash
   pnpm install
   pnpm dev:app
   ```

GUI 会先查找 `CODING_HELPER_PATH`，再在开发环境中使用仓库的 `../bin/coding-helper`，最后从 `PATH` 查找 `coding-helper`。

如果 CLI 不在 `PATH`，可显式指定：

```bash
CODING_HELPER_PATH=/absolute/path/to/coding-helper pnpm dev:app
```

## 开发

```bash
# 构建前端
pnpm build

# 启动 Tauri 开发应用（需要先构建根目录 CLI）
cd .. && make build
cd gui && pnpm dev:app

# 构建 macOS GUI 应用；产物不包含 coding-helper
pnpm mac
```

## 架构

- React 前端通过 Tauri `invoke` 调用 Rust 后端。
- Rust 后端执行 `coding-helper gui '<JSON request>'`。
- Go CLI 提供内部 JSON bridge，复用 CLI 的 `Settings`、模型查询和工具配置代码。
- GUI bundle 仅包含前端资源与 Tauri 壳；它不会重复下载或携带 `coding-helper`、Node、旧的 `bridge.mjs`。
