# 工具配置详解 — coding-helper

本文档详细描述 `coding-helper` 在配置五种受支持的编程工具时所做的操作。针对每个工具，我们列出了创建/修改的文件、写入的具体值、副作用和重要行为说明。

所有工具共享在 `src/lib/constants.ts` 中定义的两个 API 计划：

| 计划 | ID | OpenAI 兼容端点 | Anthropic 兼容端点 |
|---|---|---|---|
| 胜算云 | `cp_test_lite` | `https://router.shengsuanyun.com/api/cp/v1` | `https://ark.cn-beijing.volces.com/api/coding` |
| Pro Plan | `cp_test_pro` | `https://router.shengsuanyun.com/api/cp/v1` | `https://ark.ap-southeast.bytepluses.com/api/coding` |

各计划可用模型：

| 模型 ID | 上下文长度 | 最大输出 Token | 输入模态（Volcano） | 输入模态（Pro Plan） | 可用计划 |
|---|---|---|---|---|---|
| `ark-code-latest` | 256,000 | 32,000 | text, image | text | Volcano, Pro Plan |
| `doubao-seed-code` | 256,000 | 32,000 | text, image | — | 仅 Volcano |
| `bytedance-seed-code` | 256,000 | 32,000 | — | text | 仅 Pro Plan |
| `glm-4.7` | 200,000 | 128,000 | text | text | Volcano, Pro Plan |
| `deepseek-v3.2` | 128,000 | 32,000 | （未指定，默认 text） | — | 仅 Volcano |
| `doubao-seed-2.0-code` | 256,000 | 128,000 | text, image | — | 仅 Volcano |
| `doubao-seed-2.0-pro` | 256,000 | 128,000 | text, image | — | 仅 Volcano |
| `doubao-seed-2.0-lite` | 256,000 | 128,000 | text, image | — | 仅 Volcano |
| `minimax-m2.5` | 200,000 | 128,000 | text | — | 仅 Volcano |
| `kimi-k2.5` | 256,000 | 32,000 | text, image | text | Volcano, Pro Plan |

---

## 目录

1. [Claude Code](#1-claude-code)
2. [OpenCode](#2-opencode)
3. [OpenClaw](#3-openclaw)
4. [ZeroClaw](#4-zeroclaw)
5. [Nanobot](#5-nanobot)
6. [对比总结](#6-对比总结)

---

## 1. Claude Code

**源文件：** `src/lib/claude-integration.ts`（类 `ClaudeIntegration`）

### 修改的文件

| 文件 | 用途 | 格式 |
|---|---|---|
| `~/.claude/settings.json` | Claude Code 主设置 — 通过环境变量完成 API 路由 | JSON |
| `~/.claude.json` | Claude Code MCP 配置 — 设置 `hasCompletedOnboarding: true` 跳过初始引导 | JSON |
| Shell RC 文件（如 `~/.zshrc`、`~/.bashrc`、`~/.config/fish/config.fish`、`~/.profile`） | 移除冲突的 `export ANTHROPIC_*` 行 | Shell 脚本 |

### 写入的内容

#### `~/.claude/settings.json`

`loadPlanConfig()` 方法会将以下内容合并到现有设置中，保留所有不冲突的键：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<apiKey>",
    "ANTHROPIC_BASE_URL": "<plan.anthropicBaseUrl>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "<selectedModel>",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "<selectedModel>",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "<selectedModel>",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
  }
}
```

**逐字段说明：**

| 键 | 值 | 说明 |
|---|---|---|
| `ANTHROPIC_AUTH_TOKEN` | 用户的 API Key | 使用 `AUTH_TOKEN`（而非 `API_KEY`）。env 块中已有的 `ANTHROPIC_API_KEY` 会被**移除**（通过解构剔除）。 |
| `ANTHROPIC_BASE_URL` | `plan.anthropicBaseUrl` | 指向 **Anthropic 兼容**端点（如 `https://ark.cn-beijing.volces.com/api/coding`）。注意：这与其他工具使用的 OpenAI 兼容端点不同。 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `<model>` 或 `"doubao-seed-code"` | 未指定模型时默认使用 `doubao-seed-code`（不是计划中的第一个模型）。 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 同上 | 三个模型层级（haiku/sonnet/opus）全部设为**相同**的模型。 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 同上 | |
| `API_TIMEOUT_MS` | `"3000000"`（字符串） | 50 分钟超时。 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1`（数值） | 禁用遥测/非必要网络请求。 |

#### `~/.claude.json`

```json
{
  "hasCompletedOnboarding": true
}
```

与现有 MCP 配置合并。`hasCompletedOnboarding` 标志告诉 Claude Code 跳过内置的首次运行引导向导。

### 副作用

#### Shell RC 清理（`purgeConflictingEnvVars`）

仅在当前环境中已设置 `process.env.ANTHROPIC_API_KEY` 或 `process.env.ANTHROPIC_BASE_URL` 时才执行。

**Shell RC 文件检测逻辑：**
- `bash` → `~/.bashrc`
- `zsh` → `~/.zshrc`
- `fish` → `~/.config/fish/config.fish`
- 其他/未知 → `~/.profile`
- Windows → 完全跳过

**被移除的行**（匹配以下模式的任意行）：
- `export ANTHROPIC_BASE_URL=...`
- `export ANTHROPIC_API_KEY=...`
- `export ANTHROPIC_AUTH_TOKEN=...`
- `# coding-helper...`（带 coding-helper 标记的注释行）

### 卸载行为（`unloadPlanConfig`）

从 `settings.json > env` 中移除以下键：
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `API_TIMEOUT_MS`
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`

如果移除后 `env` 对象变为空，则从 settings 中删除整个 `env` 键。

### 检测（`detectCurrentConfig`）

读取 `~/.claude/settings.json`，检查 env 块中是否存在 `ANTHROPIC_AUTH_TOKEN`。将 `ANTHROPIC_BASE_URL` 与已知计划的 `anthropicBaseUrl` 值进行匹配，以判断当前激活的计划。

### MCP 管理

Claude Code 还有专用的 MCP 服务器管理方法：
- `installMCP(mcpId, config)` — 向 `~/.claude.json > mcpServers` 添加条目
- `uninstallMCP(mcpId)` — 移除条目
- `isMCPInstalled(mcpId)` — 检查是否存在
- `getInstalledMCPs()` — 列出所有 MCP 服务器 ID
- `getAllMCPServers()` — 返回完整的 MCP 服务器配置映射

MCP 服务器配置结构：
```json
{
  "type": "stdio | sse | http",
  "command": "string (stdio 类型)",
  "args": ["array"],
  "env": { "KEY": "VALUE" },
  "url": "string (sse/http 类型)",
  "headers": { "KEY": "VALUE" }
}
```

---

## 2. OpenCode

**源文件：** `src/lib/opencode-integration.ts`（类 `OpenCodeIntegration`）

### 修改的文件

| 文件 | 用途 | 格式 |
|---|---|---|
| `~/.config/opencode/opencode.json` | Provider、模型配置和 API Key（单文件） | JSON |

### 写入的内容

#### `~/.config/opencode/opencode.json`

以 Volcano 计划、模型 `ark-code-latest` 为例：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "cp_test_lite/ark-code-latest",
  "provider": {
    "cp_test_lite": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Lite Plan",
      "options": {
        "baseURL": "https://router.shengsuanyun.com/api/cp/v1",
        "apiKey": "<apiKey>"
      },
      "models": {
        "ark-code-latest": {
          "name": "ark-code-latest",
          "limit": { "context": 256000, "output": 4096 },
          "modalities": { "input": ["text", "image"], "output": ["text"] }
        },
        "doubao-seed-code": {
          "name": "doubao-seed-code",
          "limit": { "context": 256000, "output": 4096 },
          "modalities": { "input": ["text", "image"], "output": ["text"] }
        },
        "glm-4.7": {
          "name": "glm-4.7",
          "limit": { "context": 200000, "output": 4096 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "deepseek-v3.2": {
          "name": "deepseek-v3.2",
          "limit": { "context": 128000, "output": 4096 }
        },
        "doubao-seed-2.0-code": {
          "name": "doubao-seed-2.0-code",
          "limit": { "context": 256000, "output": 4096 },
          "modalities": { "input": ["text", "image"], "output": ["text"] }
        },
        "doubao-seed-2.0-pro": {
          "name": "doubao-seed-2.0-pro",
          "limit": { "context": 256000, "output": 4096 },
          "modalities": { "input": ["text", "image"], "output": ["text"] }
        },
        "doubao-seed-2.0-lite": {
          "name": "doubao-seed-2.0-lite",
          "limit": { "context": 256000, "output": 4096 },
          "modalities": { "input": ["text", "image"], "output": ["text"] }
        },
        "minimax-m2.5": {
          "name": "minimax-m2.5",
          "limit": { "context": 200000, "output": 4096 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "kimi-k2.5": {
          "name": "kimi-k2.5",
          "limit": { "context": 256000, "output": 4096 },
          "modalities": { "input": ["text", "image"], "output": ["text"] }
        }
      }
    }
  }
}
```

**逐字段说明：**

| 键 | 值 | 说明 |
|---|---|---|
| `$schema` | `https://opencode.ai/config.json` | 始终设置。 |
| `model` | `<planId>/<modelId>` | 格式包含 provider 前缀（如 `cp_test_lite/ark-code-latest`）。未指定时默认使用计划中的第一个模型。 |
| `provider.<planId>.npm` | `@ai-sdk/openai-compatible` | 始终为此 SDK 包。 |
| `provider.<planId>.name` | `plan.name` | 人类可读名称（如 `"Lite Plan"`、`"Pro Plan"`）。 |
| `provider.<planId>.options.baseURL` | `plan.baseUrl` | **OpenAI 兼容**端点（`/api/coding/v3`）。 |
| `provider.<planId>.options.apiKey` | API Key | 直接存储在 provider options 中，由 `@ai-sdk/openai-compatible` SDK 透传为 `Authorization: Bearer` 请求头。 |
| `provider.<planId>.models.<id>.limit.output` | `4096` | 所有模型的输出限制均为硬编码值。 |
| `provider.<planId>.models.<id>.limit.context` | 来自 `plan.models` | 每个模型各自的上下文窗口大小。 |
| `provider.<planId>.models.<id>.modalities` | `{ input: [...], output: [...] }` | 模型支持的输入/输出模态。可选值：`text`、`image`、`audio`、`video`、`pdf`。未指定时 OpenCode 默认 `text=true`，其他 `false`。仅当 `constants.ts` 中定义了 `modalities` 时写入。 |

已有的 `defaultModel` 键（旧格式）如果存在会被显式删除。

> **注意：** 早期版本将 API Key 单独存储在 `~/.local/share/opencode/auth.json` 中。当前版本直接写入 `provider.options.apiKey`，单文件管理。检测配置时仍兼容读取旧版 `auth.json`。

### 卸载行为（`unloadPlanConfig`）

- 如果指定了 `planId`：仅移除该计划的 provider 条目（API Key 随 provider 一起删除）
- 如果未指定 `planId`：同时移除 `cp_test_lite` 和 `cp_test_pro` 的 provider 条目
- 如果当前激活的 `model` 以被移除计划的 ID 开头（如 `cp_test_lite/...`），也会删除 `model` 键
- 如果没有 provider 剩余，则删除整个 `provider` 键
- 同时清理旧版 `auth.json` 中的残留条目（如果存在）

### 检测（`detectCurrentConfig`）

优先从 `model` 字段中提取当前激活的计划 ID（格式 `<planId>/<modelId>`），然后从 `provider.options.apiKey` 读取 API Key。如果不存在，兜底读取旧版 `auth.json`。仅当 `model` 不存在时，才按 `cp_test_lite`、`cp_test_pro` 顺序扫描 `provider` 作为兜底。

---

## 3. OpenClaw

**源文件：** `src/lib/openclaw-manager.ts`（类 `OpenClawManager`）

### 修改的文件

| 文件 | 用途 | 格式 |
|---|---|---|
| `~/.openclaw/openclaw.json` | Provider、模型和 Agent 配置 | JSON |
| `~/.openclaw/auth-profiles.json` | API Key 存储（命名配置文件） | JSON |
| `~/.openclaw/agents/main/sessions/sessions.json` | 会话级模型覆盖（session override） | JSON |

### 写入的内容

#### `~/.openclaw/openclaw.json`

以 Volcano 计划、模型 `ark-code-latest` 为例：

```json
{
  "models": {
    "providers": {
      "cp_test_lite": {
        "baseUrl": "https://router.shengsuanyun.com/api/cp/v1",
        "apiKey": "<apiKey>",
        "api": "openai-completions",
        "models": [
          {
            "id": "ark-code-latest",
            "name": "ark-code-latest",
            "contextWindow": 256000,
            "maxTokens": 32000,
            "input": ["text", "image"]
          },
          {
            "id": "doubao-seed-code",
            "name": "doubao-seed-code",
            "contextWindow": 256000,
            "maxTokens": 32000,
            "input": ["text", "image"]
          },
          {
            "id": "glm-4.7",
            "name": "glm-4.7",
            "contextWindow": 200000,
            "maxTokens": 128000,
            "input": ["text"]
          },
          {
            "id": "deepseek-v3.2",
            "name": "deepseek-v3.2",
            "contextWindow": 128000,
            "maxTokens": 32000
          },
          {
            "id": "doubao-seed-2.0-code",
            "name": "doubao-seed-2.0-code",
            "contextWindow": 256000,
            "maxTokens": 128000,
            "input": ["text", "image"]
          },
          {
            "id": "doubao-seed-2.0-pro",
            "name": "doubao-seed-2.0-pro",
            "contextWindow": 256000,
            "maxTokens": 128000,
            "input": ["text", "image"]
          },
          {
            "id": "doubao-seed-2.0-lite",
            "name": "doubao-seed-2.0-lite",
            "contextWindow": 256000,
            "maxTokens": 128000,
            "input": ["text", "image"]
          },
          {
            "id": "minimax-m2.5",
            "name": "minimax-m2.5",
            "contextWindow": 200000,
            "maxTokens": 128000,
            "input": ["text"]
          },
          {
            "id": "kimi-k2.5",
            "name": "kimi-k2.5",
            "contextWindow": 256000,
            "maxTokens": 32000,
            "input": ["text", "image"]
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "cp_test_lite/ark-code-latest"
      },
      "models": {
        "cp_test_lite/ark-code-latest": {},
        "cp_test_lite/doubao-seed-code": {},
        "cp_test_lite/glm-4.7": {},
        "cp_test_lite/deepseek-v3.2": {},
        "cp_test_lite/doubao-seed-2.0-code": {},
        "cp_test_lite/doubao-seed-2.0-pro": {},
        "cp_test_lite/doubao-seed-2.0-lite": {},
        "cp_test_lite/minimax-m2.5": {},
        "cp_test_lite/kimi-k2.5": {}
      }
    }
  }
}
```

**逐字段说明：**

| 键 | 值 | 说明 |
|---|---|---|
| `models.providers.<planId>.baseUrl` | `plan.baseUrl` | **OpenAI 兼容**端点。 |
| `models.providers.<planId>.apiKey` | API Key | 注意：API Key **同时**存储在此处和 auth-profiles.json 中。 |
| `models.providers.<planId>.api` | `"openai-completions"` | 始终为此值。 |
| `models.providers.<planId>.models[].maxTokens` | 来自 `plan.models` | 每个模型各自的最大输出 Token 数（如 32000、128000）。 |
| `models.providers.<planId>.models[].contextWindow` | 来自 `plan.models` | 每个模型各自的上下文窗口。 |
| `models.providers.<planId>.models[].input` | `["text"]` 或 `["text", "image"]` | 模型支持的输入模态。OpenClaw 用此字段决定是否启用图片加载、vision 工具等能力。未指定时默认 `["text"]`。仅当 `constants.ts` 中定义了 `modalities.input` 时写入。 |
| `agents.defaults.model.primary` | `<planId>/<modelId>` | 带 provider 前缀的格式，与 OpenCode 相同。新会话无 session override 时使用此值作为默认模型。 |
| `agents.defaults.models` | `{ "<planId>/<modelId>": {} }` | 模型目录（allowlist）。包含当前计划的所有模型，允许用户在 OpenClaw 中通过 `/model` 命令自由切换。对齐 OpenClaw 自身 `applyPrimaryModel` 的行为。 |

#### 域名去重

写入新 provider 前，OpenClaw 会扫描所有已有的 provider。如果任何其他 provider（非当前计划）与新计划的 `baseUrl` 共享相同的域名，该 provider 会被**移除**。这防止了因之前手动执行 `openclaw onboard` 而产生的重复条目（如使用了自定义 provider 名称指向同一域名）。

`agents.defaults.models` 下引用已移除 provider ID 的模型条目也会被清理。

#### `~/.openclaw/agents/main/sessions/sessions.json`

写入配置后，coding-helper 会同步更新所有已有 session 的模型覆盖，确保配置立即生效：

```json
{
  "agent:main:main": {
    "providerOverride": "cp_test_lite",
    "modelOverride": "ark-code-latest",
    "updatedAt": 1773202685139,
    "...其他字段保留不变"
  }
}
```

**对每个 session entry 的操作：**

| 字段 | 操作 | 说明 |
|---|---|---|
| `providerOverride` | 设置为 `plan.id` | 覆盖 provider |
| `modelOverride` | 设置为选中的模型 ID | 覆盖模型（优先级高于 `openclaw.json` 的 `model.primary`） |
| `model` | 删除 | 清除过期的运行时缓存 |
| `modelProvider` | 删除 | 清除过期的运行时缓存 |
| `contextTokens` | 删除 | 清除过期的上下文窗口缓存，让 OpenClaw 下次运行时重新解析 |
| `updatedAt` | 设置为当前时间戳 | 标记更新时间 |

**OpenClaw 模型优先级（文件级别）：**

```
sessions.json (modelOverride)  >  openclaw.json (model.primary)
```

`sessions.json` 中的 `modelOverride` 是最高优先级。如果不更新 session，已有会话会继续使用旧模型，coding-helper 的配置对它们不生效。

#### `~/.openclaw/auth-profiles.json`

```json
{
  "profiles": {
    "cp_test_lite:default": {
      "type": "api_key",
      "key": "<apiKey>"
    }
  }
}
```

| 键 | 值 | 说明 |
|---|---|---|
| Profile 键名 | `<planId>:default` | 格式为 `planId:default`（如 `cp_test_lite:default`）。 |
| `type` | `"api_key"` | 始终为此值（注意下划线 — 与 OpenCode 的 `"api"` 不同）。 |
| `key` | API Key | 与 provider 配置中存储的相同。 |

### coding-helper 与 OpenClaw 的写入交互

OpenClaw 自身和 coding-helper 会写入相同的文件和字段。以下说明两种场景下的交互行为：

#### 场景 A：全新安装（用户从未配过 OpenClaw）

coding-helper 是唯一写入者，无冲突：

```
coding-helper
   ├──▶ openclaw.json
   │       ├─ models.providers.<planId>      [provider 配置]
   │       ├─ agents.defaults.model.primary  [默认模型]
   │       └─ agents.defaults.models         [allowlist: 全部 plan 模型]
   ├──▶ auth-profiles.json
   │       └─ profiles.<planId>:default      [API key]
   └──▶ sessions.json
           └─ (文件不存在，跳过)
```

#### 场景 B：用户已安装 OpenClaw 并配置过

```
时间线：
──────────────────────────────────────────────────────────────▶

┌─ Step 1 ─┐    ┌─ Step 2 ─┐    ┌─ Step 3 ─┐    ┌─ Step 4 ─┐
│ openclaw │    │  用户在   │    │ coding-helper│    │  用户在   │
│ onboard  │    │ OpenClaw  │    │   配置    │    │ OpenClaw  │
│          │    │ /model 切 │    │          │    │ /model 切 │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
```

**openclaw.json 中的交互：**

| 字段 | Step 1 (onboard) | Step 3 (coding-helper) | 结果 |
|---|---|---|---|
| `model.primary` | 写入 A | 覆盖为 B | 最终值 = B |
| `models` (allowlist) | 创建 {A} | 合并，追加 plan 全部模型 | {A, plan 模型...} |
| `models.providers` | 创建 provider X | 域名去重后替换为 provider Y | 最终值 = Y |

**sessions.json 中的交互：**

| 字段 | Step 2 (/model) | Step 3 (coding-helper) | Step 4 (/model) |
|---|---|---|---|
| `modelOverride` | 写入 X | 覆盖为 Y | 覆盖为 Z |
| `providerOverride` | 写入 | 覆盖 | 覆盖 |

**三个文件的写入者与运行时优先级：**

```
                        写入者
文件                    OpenClaw          coding-helper        运行时优先级
─────────────────────── ───────────────── ───────────────── ──────────
openclaw.json
  model.primary         onboard/config    loadPlanConfig    低（兜底默认）
  models (allowlist)    applyPrimaryModel loadPlanConfig    约束层（过滤）

auth-profiles.json      onboard           loadPlanConfig    —

sessions.json
  modelOverride         /model 命令       loadPlanConfig    高（最终决定）
  providerOverride      /model 命令       loadPlanConfig    高（最终决定）
```

**模型生效的决策链（coding-helper 视角，简化版）：**

```
sessions.json 有 modelOverride?
     │
     ├─ 是 ──▶ 用它（不看 openclaw.json）
     │            │
     │            └─ 但必须在 models allowlist 内
     │
     └─ 否 ──▶ 用 openclaw.json 的 model.primary
```

### OpenClaw 完整的模型选择机制

OpenClaw 的"当前模型"由多个输入源决定，不仅限于 `modelOverride` 和 `model.primary`。以下是完整的解析链。

#### sessions.json 中的字段角色

| 字段 | 角色 | 说明 |
|---|---|---|
| `modelOverride` | **输入** — 决策源 | `/model` 命令写入的显式覆盖，最高优先级 |
| `providerOverride` | **输入** — 决策源 | 与 `modelOverride` 配对使用 |
| `model` | **输出** — 运行时缓存 | 记录最终解析出的模型，非选择源 |
| `modelProvider` | **输出** — 运行时缓存 | 记录最终解析出的 provider |
| `systemPromptReport.model` | **输出** — 只读快照 | 本次 run 实际使用的模型，审计/调试用 |

#### 所有模型输入源（按优先级从高到低）

| 优先级 | 源头 | 配置位置 | 作用域 | coding-helper 可写？ |
|---|---|---|---|---|
| 1 | `/model` 内联指令 | 消息体 | 单条消息（同时持久化到 session `modelOverride`） | 否 |
| 2 | session `modelOverride` | `sessions.json` | 当前会话 | **是** |
| 3 | 父会话继承 | 线程解析 | 线程/主题子会话 | 否 |
| 4 | 心跳定时任务模型 | `openclaw.json` `agents.defaults.heartbeat.model` | 定时任务 | 否 |
| 5 | 频道级覆盖 | `openclaw.json` `channels.modelByChannel.<channel>` | 特定频道/群组 | 否 |
| 6 | Plugin Hook | `before_model_resolve` hook 返回值 | 动态/可编程 | 否 |
| 7 | Per-agent 默认 | `openclaw.json` `agents.list[agentId].model` | 特定 agent | 否 |
| 8 | Subagent 生成参数 | `sessions_spawn` 工具的 `model` 参数 | 派生会话 | 否 |
| 9 | Subagent 配置默认 | `openclaw.json` `agents.defaults.subagents.model` | subagent | 否 |
| 10 | 全局默认 | `openclaw.json` `agents.defaults.model.primary` | 系统全局 | **是** |
| 11 | 硬编码兜底 | OpenClaw 源码 `defaults.ts` | 最终后备 | 否 |

coding-helper 能写的是优先级 **2**（session `modelOverride`）和 **10**（`model.primary`）。

#### 普通终端用户的典型优先级链

```
/model 内联指令 (消息级，同时写入 session)
    │
    ▼
session modelOverride (会话级)
    │
    ▼ 如果为空
父会话 modelOverride (线程继承)
    │
    ▼ 如果为空
agents.defaults.model.primary (全局配置)
    │
    ▼ 如果为空
硬编码 claude-opus-4-5 (兜底)
```

#### `/model` 的作用域与 `/new` 的行为

`/model` 是 **session-scoped** 的——只写当前 session 的 `modelOverride`，**不修改** `openclaw.json` 的 `model.primary`：

```
/model glm-4.7
    │
    ├─ 当前 session: modelOverride = glm-4.7    ✅ 立即生效
    ├─ 之前的 session: modelOverride 不变        ✗ 不受影响
    └─ /new 新 session: modelOverride = 空       ✗ fallback 到 model.primary
```

**`/new` 不继承 `modelOverride`。** 新 session 没有 `modelOverride`，直接 fallback 到 `agents.defaults.model.primary`。

#### `model.primary` 何时被修改

`model.primary` 只在 **onboarding/配置流程** 中被 OpenClaw 修改（通过内部函数 `applyPrimaryModel()`）：

- `openclaw onboard`（初始化向导）
- 认证配置（VolcEngine / Pro Plan / 自定义 / 网关）
- coding-helper `loadPlanConfig()`

**运行时从不更新它。** 它本质上是一个"一次性写入"的值。

### 卸载行为（`unloadPlanConfig`）

- 从 `models.providers` 中移除 provider 条目
- 移除 auth profile（`<planId>:default`）
- 如果当前激活的 model primary 以被移除计划的 ID 开头，清除 `agents.defaults.model`
- 清理空对象

### 检测（`detectCurrentConfig`）

优先从 `agents.defaults.model.primary` 中提取当前激活的计划 ID（格式 `<planId>/<modelId>`），然后从 `auth-profiles.json` 中查找对应的 API Key。仅当 `primary` 不存在时，才按 `cp_test_lite`、`cp_test_pro` 顺序扫描 `models.providers` 作为兜底。

---

## 4. ZeroClaw

**源文件：** `src/lib/zeroclaw-manager.ts`（类 `ZeroClawManager`）

### 修改的文件

| 文件 | 用途 | 格式 |
|---|---|---|
| `~/.zeroclaw/config.toml` | 所有配置（provider、模型、API Key）集于一个文件 | **TOML** |

### 前置条件

**ZeroClaw 需要预先完成初始化。** 如果 `~/.zeroclaw/config.toml` 不存在，`loadPlanConfig()` 会抛出异常：

```
ZeroClaw 尚未初始化，请先运行 `zeroclaw onboard` 完成安装后再配置。
```

用户必须先运行 `zeroclaw onboard`，coding-helper 才能对其进行配置。

### 写入的内容

#### `~/.zeroclaw/config.toml`

以 Volcano 计划、模型 `ark-code-latest` 为例：

```toml
api_key = "<apiKey>"
default_provider = "custom:https://router.shengsuanyun.com/api/cp/v1"
default_model = "ark-code-latest"
```

**逐字段说明：**

| 键 | 值 | 说明 |
|---|---|---|
| `api_key` | API Key | 作为顶层键直接存储在配置文件中（无独立的 auth 文件）。 |
| `default_provider` | `custom:<baseUrl>` | 以 `custom:` 为前缀，后接 **OpenAI 兼容**端点 URL。 |
| `default_model` | 模型 ID 字符串 | 无 provider 前缀 — 仅裸模型 ID（如 `ark-code-latest`）。 |

TOML 文件使用 `@iarna/toml` 包进行解析/序列化。

### 内部计划映射

```typescript
const PLAN_TO_ZEROCLAW = {
  cp_test_lite: { apiBase: 'https://router.shengsuanyun.com/api/cp/v1' },
  cp_test_pro: { apiBase: 'https://router.shengsuanyun.com/api/cp/v1' }
};

const PLAN_TO_LEGACY_PROFILE = {
  cp_test_lite: 'volcengine-coding-plan',
  cp_test_pro: 'byteplus-coding-plan'
};
```

### 旧版清理

写入配置时，代码还会清理旧格式的 `model_providers` 条目：
- 键名中包含任何已知 `apiBase` URL 的条目
- 名为 `volcengine-coding-plan` 或 `byteplus-coding-plan` 的条目

这些是旧版 ZeroClaw 配置格式的遗留物。

### 卸载行为（`unloadPlanConfig`）

- 如果 `default_provider` 以 `custom:` 开头且匹配已知计划的 API base，则删除 `default_provider`、`default_model` 和 `api_key`
- 同时检查并清理 `model_providers` 中的旧版 profile 条目
- 仅在确实发生了更改时才写入磁盘

### 检测（`detectCurrentConfig`）

三条检测路径：
1. **新格式：** 如果 `default_provider` 以 `custom:` 开头，提取 URL 并与已知计划的 API base 匹配
2. **旧格式：** 如果 `default_provider` 匹配旧版 profile 名称（如 `volcengine-coding-plan`），从 `model_providers.<profileName>.api_key` 读取 API Key
3. **兜底：** 扫描 `model_providers` 中的所有旧版 profile，查找任何包含 API Key 的条目

---

## 5. Nanobot

**源文件：** `src/lib/nanobot-manager.ts`（类 `NanobotManager`）

### 修改的文件

| 文件 | 用途 | 格式 |
|---|---|---|
| `~/.nanobot/config.json` | 所有配置（providers、agent 默认值）集于一个文件 | JSON |

### 新版与旧版 Nanobot 的检测

Nanobot 有两种配置格式。Manager 会自动检测使用哪种：

**检测逻辑：** 如果 `providers` 中存在 `volcengineCodingPlan` 或 `byteplusCodingPlan` 中的任意一个键，则为**新版 Nanobot**。否则为**旧版 Nanobot**，使用 `custom` 槽位。

| 方面 | 新版 Nanobot | 旧版 Nanobot |
|---|---|---|
| `providers` 中的键名 | `volcengineCodingPlan` / `byteplusCodingPlan`（驼峰命名） | `custom` |
| `agents.defaults.provider` 值 | `volcengine_coding_plan` / `byteplus_coding_plan`（下划线命名） | `custom` |
| 模型格式 | 裸 ID（如 `ark-code-latest`） | 裸 ID（如 `ark-code-latest`） |

### 内部计划映射

```typescript
const PLAN_TO_NANOBOT = {
  cp_test_lite: {
    providerName: 'volcengineCodingPlan',        // providers 对象中的键名
    agentProvider: 'volcengine_coding_plan',       // agents.defaults.provider 的值
    apiBase: 'https://router.shengsuanyun.com/api/cp/v1'
  },
  cp_test_pro: {
    providerName: 'byteplusCodingPlan',
    agentProvider: 'byteplus_coding_plan',
    apiBase: 'https://router.shengsuanyun.com/api/cp/v1'
  }
};
```

### 写入的内容

#### `~/.nanobot/config.json`（新版 Nanobot）

```json
{
  "agents": {
    "defaults": {
      "model": "ark-code-latest",
      "provider": "volcengine_coding_plan"
    }
  },
  "providers": {
    "volcengineCodingPlan": {
      "apiKey": "<apiKey>",
      "apiBase": "https://router.shengsuanyun.com/api/cp/v1"
    }
  }
}
```

#### `~/.nanobot/config.json`（旧版 Nanobot）

```json
{
  "agents": {
    "defaults": {
      "model": "ark-code-latest",
      "provider": "custom"
    }
  },
  "providers": {
    "custom": {
      "apiKey": "<apiKey>",
      "apiBase": "https://router.shengsuanyun.com/api/cp/v1"
    }
  }
}
```

**逐字段说明：**

| 键 | 值 | 说明 |
|---|---|---|
| `providers.<name>.apiKey` | API Key | 直接存储在 provider 配置中。 |
| `providers.<name>.apiBase` | `plan.baseUrl`（OpenAI 兼容） | 无 `custom:` 前缀（与 ZeroClaw 不同）。 |
| `agents.defaults.model` | 裸模型 ID | 无 provider 前缀（与 OpenCode/OpenClaw 不同）。 |
| `agents.defaults.provider` | 下划线命名或 `"custom"` | 注意与 provider 键名的大小写风格不同！ |

### 跨版本清理

写入配置时：
- **新版 Nanobot：** 删除 `custom` provider 条目（旧版遗留）
- **旧版 Nanobot：** 删除命名 provider 条目（如 `volcengineCodingPlan`）

确保同一时间只有一种格式处于激活状态。

### 卸载行为（`unloadPlanConfig`）

- **新版 Nanobot providers：** **不删除**键 — 而是将 `apiKey` 清空为 `""` 、`apiBase` 设为 `null`。保留键的存在是为了让后续检测仍能识别为新版 Nanobot。
- **旧版 `custom` provider：** 完全删除。
- 如果当前 provider 匹配任何已知的 coding-helper provider 名称，则清除 `agents.defaults.model` 和 `agents.defaults.provider`。

### 检测（`detectCurrentConfig`）

1. 优先从 `agents.defaults.provider` 中提取当前激活的 provider，与已知的 `agentProvider`（如 `volcengine_coding_plan`）或 `providerName`（如 `volcengineCodingPlan`）匹配
2. 兜底：扫描命名 providers（`volcengineCodingPlan`、`byteplusCodingPlan`）是否有非空的 `apiKey`
3. 降级检查 `custom` 槽位，通过 `apiBase` 反向映射到计划 ID

---

## 6. 对比总结

### 配置文件与格式

| 工具 | 配置文件 | 认证文件 | 格式 | 认证独立存储？ |
|---|---|---|---|---|
| Claude Code | `~/.claude/settings.json` | 无（同一文件，`env` 块） | JSON | 否 |
| OpenCode | `~/.config/opencode/opencode.json` | `~/.local/share/opencode/auth.json` | JSON | 是 |
| OpenClaw | `~/.openclaw/openclaw.json` | `~/.openclaw/auth-profiles.json` | JSON | 是 |

**OpenClaw 附加文件：**

| 文件 | 用途 |
|---|---|
| `~/.openclaw/agents/main/sessions/sessions.json` | 同步更新所有已有 session 的 `modelOverride`/`providerOverride`，确保配置立即生效 |
| ZeroClaw | `~/.zeroclaw/config.toml` | 无（同一文件） | TOML | 否 |
| Nanobot | `~/.nanobot/config.json` | 无（同一文件） | JSON | 否 |

### 附加文件（仅 Claude Code）

| 文件 | 用途 |
|---|---|
| `~/.claude.json` | MCP 配置，`hasCompletedOnboarding: true` |
| Shell RC（`~/.zshrc` 等） | 移除冲突的 `export ANTHROPIC_*` 行 |

### 使用的 API 端点

| 工具 | 端点类型 | URL 路径 |
|---|---|---|
| Claude Code | **Anthropic 兼容** | `/api/coding` |
| OpenCode | OpenAI 兼容 | `/api/coding/v3` |
| OpenClaw | OpenAI 兼容 | `/api/coding/v3` |
| ZeroClaw | OpenAI 兼容 | `/api/coding/v3` |
| Nanobot | OpenAI 兼容 | `/api/coding/v3` |

### 模型 ID 格式

| 工具 | 格式 | 示例 |
|---|---|---|
| Claude Code | 裸字符串 | `doubao-seed-code` |
| OpenCode | `planId/modelId` | `cp_test_lite/ark-code-latest` |
| OpenClaw | `planId/modelId` | `cp_test_lite/ark-code-latest` |
| ZeroClaw | 裸字符串 | `ark-code-latest` |
| Nanobot | 裸字符串 | `ark-code-latest` |

### 未指定时的默认模型

| 工具 | 默认模型 |
|---|---|
| Claude Code | `doubao-seed-code` |
| OpenCode | 计划中的第一个模型（`ark-code-latest`） |
| OpenClaw | 计划中的第一个模型（`ark-code-latest`） |
| ZeroClaw | 计划中的第一个模型（`ark-code-latest`） |
| Nanobot | 计划中的第一个模型（`ark-code-latest`） |

### 模型能力声明（Modalities）

| 工具 | 字段名 | 格式 | 说明 |
|---|---|---|---|
| Claude Code | 不适用 | — | 通过环境变量配置，不涉及模型能力声明 |
| OpenCode | `modalities` | `{ input: ["text", "image"], output: ["text"] }` | 嵌套对象，声明输入和输出模态。未指定时默认 text=true，其他 false |
| OpenClaw | `input` | `["text", "image"]` | 扁平数组，仅声明输入模态。未指定时默认 `["text"]` |
| ZeroClaw | 不适用 | — | 配置格式不支持 |
| Nanobot | 不适用 | — | 配置格式不支持 |

### 输出 Token 限制

| 工具 | 最大输出 Token | 说明 |
|---|---|---|
| Claude Code | 未设置 | 由 Claude Code 自身控制 |
| OpenCode | 4,096 | 硬编码在配置中 |
| OpenClaw | 按模型各异 | 来自 `constants.ts` 中每个模型的 `maxTokens` 定义（32,000 ~ 128,000） |
| ZeroClaw | 未设置 | 不属于配置格式 |
| Nanobot | 未设置 | 不属于配置格式 |

### 认证键名称/位置

| 工具 | 键名 | 位置 |
|---|---|---|
| Claude Code | `ANTHROPIC_AUTH_TOKEN` | `~/.claude/settings.json > env` |
| OpenCode | `key` | `~/.local/share/opencode/auth.json > <planId>.key` |
| OpenClaw | `key` | `~/.openclaw/auth-profiles.json > profiles.<planId>:default.key` |
| ZeroClaw | `api_key` | `~/.zeroclaw/config.toml`（顶层） |
| Nanobot | `apiKey` | `~/.nanobot/config.json > providers.<name>.apiKey` |

### 前置条件

| 工具 | 要求 | 安装命令 |
|---|---|---|
| Claude Code | 无 | `npm install -g @anthropic-ai/claude-code` |
| OpenCode | 无 | `npm install -g opencode-ai` |
| OpenClaw | 无 | `npm install -g openclaw` |
| ZeroClaw | **必须先运行 `zeroclaw onboard`** | `brew install zeroclaw` |
| Nanobot | Python >= 3.11 | `pip install nanobot-ai` |

### 运行时

| 工具 | 运行时 |
|---|---|
| Claude Code | Node.js |
| OpenCode | Node.js |
| OpenClaw | Node.js |
| ZeroClaw | Node.js |
| Nanobot | **Python** |

### Provider 命名规范

| 工具 | Provider 标识符风格 | 示例 |
|---|---|---|
| Claude Code | 不适用（使用环境变量） | — |
| OpenCode | Plan ID | `cp_test_lite` |
| OpenClaw | Plan ID | `cp_test_lite` |
| ZeroClaw | `custom:<url>` 字符串 | `custom:https://router.shengsuanyun.com/api/cp/v1` |
| Nanobot（新版） | 驼峰键名 / 下划线引用 | `volcengineCodingPlan`（键）/ `volcengine_coding_plan`（引用） |
| Nanobot（旧版） | 固定字符串 | `custom` |
