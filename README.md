# Coding Helper

一键配置 [胜算云](https://shengsuanyun.com/) Coding Plan API 凭证到多款 AI 编程工具的 CLI 工具。

CLI tool for configuring [ShengSuanYun](https://shengsuanyun.com/) Coding Plan API credentials across multiple AI coding tools.

---

## 支持的工具 / Supported Tools

| 工具 / Tool | 运行时 / Runtime | 说明 / Description | 
|-------------|-----------------|-------------------| 
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Node.js | Anthropic AI 编程助手 / AI coding assistant | 
| [OpenCode](https://github.com/opencode-ai/opencode) | Node.js | 开源 AI 编程工具 / Open-source AI coding tool | 
| [OpenClaw](https://github.com/openclaw/openclaw) | Node.js | AI 编程网关 / AI coding gateway |  
| [PicoClaw](https://github.com/openclaw/openclaw) | go | AI 编程网关 / AI coding gateway |  
| [Codex](https://github.com/openai/codex) | rust | AI 编程网关 / AI coding gateway |


## 支持的方案 / Supported Plans

| 方案 / Plan | 模型 / Models | 
|-------------------------|-----------------------------| 
| **精简计划 / ssy_cp_lite** | anthropic/claude-sonnet-4.5, anthropic/claude-haiku-4.5, glm-4.7, deepseek-v3.2, kimi-k2-thinking, kimi-k2.5 | 
| **专业计划 / ssy_cp_pro** | openai/gpt-5.4, anthropic/claude-haiku-4.5, glm-4.7, kimi-k2-thinking, kimi-k2.5 | 
| **企业计划 / ssy_cp_enterprise** | moonshot/kimi-k2.5, doubao-seed-code, glm-4.7, anthropic/claude-sonnet-4.6 | 
| **按量付费 / pay_as_you_go** | anthropic/claude-opus-4.6, anthropic/claude-opus-4.5, deepseek-v3.2 | 

## 环境要求 / Requirements

- Node.js >= 18
- Python >= 3.11（仅 Nanobot 需要 / only for Nanobot）

## 安装 / Installation

```bash
npm install -g @coohu/coding-helper
```

## 快速开始 / Quick Start

运行交互式配置向导：/ Run the interactive setup wizard:

```bash
coding-helper
```

首次运行时，向导将引导你完成以下步骤：/ On first run, the wizard guides you through:

1. 语言选择（中文 / English）/ Language selection
2. 方案配置（胜算云 / Pro Plan API Key）/ Plan configuration
3. 工具配置（将凭证加载到所选工具）/ Tool configuration

## 使用方法 / Usage

### 快速配置（推荐）/ Quick Setup (Recommended)

如果你已经有 API Key，可以使用 `set` 命令一键完成配置：

If you already have an API key, use the `set` command for one-step setup:

```bash
# 使用格式 / Usage format
coding-helper set <tool_name> <plan_name>

# 示例 / Examples
coding-helper set codex ssy_cp_enterprise       # 配置 Codex 使用企业计划
coding-helper set claude-code ssy_cp_pro        # 配置 Claude Code 使用专业计划
coding-helper set openclaw ssy_cp_lite          # 配置 OpenClaw 使用精简计划
```

该命令会自动：/ This command will automatically:
- ✅ 检查工具是否已安装（未安装则自动安装）/ Check if tool is installed (install if missing)
- ✅ 验证 API Key 是否已配置 / Verify API key is configured
- ✅ 将配置写入对应工具的配置文件 / Write config to the tool's config file
- ✅ 配置合适的模型和端点 / Configure appropriate model and endpoint

### 交互模式 / Interactive Mode

```bash
# 主菜单（默认）/ Main menu (default)
coding-helper

# 首次初始化向导 / First-time setup wizard
coding-helper init

# 跳转到指定配置项 / Jump to a specific config section
coding-helper enter lang
coding-helper enter plan
coding-helper enter apikey
coding-helper enter opencode
coding-helper enter picoclaw
coding-helper enter codex
```

### 命令行 / CLI Commands

```bash
# 快速配置 / Quick Setup
coding-helper set codex ssy_cp_enterprise    # 快速配置 Codex 使用企业计划 / Quick setup Codex with Enterprise plan
coding-helper set claude-code ssy_cp_pro     # 快速配置 Claude Code 使用专业计划 / Quick setup Claude Code with Pro plan

# 语言 / Language
coding-helper lang show              # 查看当前语言 / Show current language
coding-helper lang set zh_CN         # 设为中文 / Set to Chinese
coding-helper lang set en_US         # 设为英文 / Set to English

# 认证 / Authentication
coding-helper auth show                         # 查看认证状态 / Show auth status
coding-helper auth ssy_cp_lite <token>         # 设置胜算云 API Key / Set Lite Plan API key
coding-helper auth ssy_cp_pro <token>          # 设置 Pro Plan API Key / Set Pro Plan API key
coding-helper auth ssy_cp_enterprise <token>   # 设置胜算云 API Key / Set Lite Plan API key
coding-helper auth pay_as_you_go <token>        # 设置 Pro Plan API Key / Set Pro Plan API key
coding-helper auth revoke ssy_cp_lite          # 撤销已保存的 API Key / Revoke a saved API key
coding-helper auth reload opencode              # 重新加载配置到工具 / Reload config into a tool

# 诊断 / Diagnostics
coding-helper doctor                 # 健康检查 / Run health check
```

## 配置 / Configuration

配置文件存储在 `~/.coding-helper/config.yaml`。每个工具的凭证会写入其自身的配置路径：

Config is stored at `~/.coding-helper/config.yaml`. Each tool gets its credentials written to its own config location:

| 工具 / Tool | 配置路径 / Config Path |
|-------------|----------------------|
| Claude Code | `~/.claude/settings.json` |
| OpenCode | `~/.config/opencode/opencode.json` |
| OpenClaw | `~/.openclaw/openclaw.json` |
| PicoClaw | `~/.picoclaw/config.json` |
| Codex | `~/.codex/config.toml` |

## 开发 / Development

```bash
# 安装依赖 / Install dependencies
npm install

# 开发模式（自动重载）/ Dev mode (auto-reload)
npm run dev

# 构建 / Build
npm run build

# 运行构建产物 / Run built version
npm start
```

## 项目结构 / Project Structure

```
src/
  cli.ts                    # 入口 / Entry point
  lib/
    command.ts              # CLI 命令定义 / CLI command definitions (commander)
    setup-flow.ts           # 交互式向导 UI / Interactive wizard UI
    settings.ts             # YAML 配置管理 / Config management (~/.coding-helper/config.yaml)
    registry.ts             # 工具安装与配置调度 / Tool installation & config orchestration
    constants.ts            # 方案、模型、工具定义 / Plans, models, tool definitions
    locale.ts               # 国际化 / i18n (zh_CN / en_US)
    auth-checker.ts         # API Key 校验 / API key validation
    claude-integration.ts   # Claude Code 配置写入 / Claude Code config writer
    opencode-integration.ts # OpenCode 配置写入 / OpenCode config writer
    openclaw-manager.ts     # OpenClaw 配置写入 / OpenClaw config writer
    nanobot-manager.ts      # Nanobot 配置写入 / Nanobot config writer
    zeroclaw-manager.ts     # ZeroClaw 配置写入 / ZeroClaw config writer
  commands/                 # 子命令处理器 / Subcommand handlers (auth, lang, doctor, config, set)
  locales/                  # 国际化 JSON 文件 / i18n JSON files
  utils/                    # 日志、终端工具 / Logger, terminal helpers
```

## 许可证 / License

MIT

感谢这些开发者的贡献：

<p align="left">
  <a href="https://www.volcengine.com/docs/82379/1928261?lang=zh">
  Ark Helper
  </a>
</p>