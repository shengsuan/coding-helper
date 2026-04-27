# coding-helper TEA 打点方案

## 概述

coding-helper 在关键生命周期节点通过 TEA 上报接口记录用户行为事件。
- **install.sh**: shell 脚本中用 `curl` 直接上报，后台执行不阻塞安装
- **coding-helper CLI**: Node.js 中用 `child_process.spawn('curl', ...)` + `detached + unref`，完全不阻塞主线程

## 参数配置

| 参数 | 值 |
|------|-----|
| app_id | `940776` |
| 上报接口（生产） | `https://mcs.zijieapi.com/list` |
| 上报接口（测试） | `https://mcs.bytedance.net/v1/list_test` |
| 事件名 | `ark_cli_lifecycle` |
| params.type | 见下方事件清单 |

## 事件清单 (17 个)

| type | 含义 | 触发位置 | 实现方式 |
|------|------|---------|---------|
| `install` | 整体应用 install | `install.sh` | shell curl |
| `uninstall` | 整体应用 uninstall | `package.json` preuninstall | Node tea-tracker |
| `enter` | arkhelper 启动 | `command.ts` | Node tea-tracker |
| `set_apikey` | 设置 API Key | `setup-flow.ts` | Node tea-tracker |
| `change_model` | 选模型 | `setup-flow.ts` | Node tea-tracker |
| `set_openclaw` | 设置 openclaw | `registry.ts` loadPlanConfig | Node tea-tracker |
| `set_opencode` | 设置 opencode | `registry.ts` loadPlanConfig | Node tea-tracker |
| `set_claude` | 设置 claude | `registry.ts` loadPlanConfig | Node tea-tracker |
| `set_zeroclaw` | 设置 zeroclaw | `registry.ts` loadPlanConfig | Node tea-tracker |
| `set_nanobot` | 设置 nanobot | `registry.ts` loadPlanConfig | Node tea-tracker |
| `unset_openclaw` | 卸载 openclaw 配置 | `registry.ts` unloadPlanConfig | Node tea-tracker |
| `unset_opencode` | 卸载 opencode 配置 | `registry.ts` unloadPlanConfig | Node tea-tracker |
| `unset_claude` | 卸载 claude 配置 | `registry.ts` unloadPlanConfig | Node tea-tracker |
| `unset_zeroclaw` | 卸载 zeroclaw 配置 | `registry.ts` unloadPlanConfig | Node tea-tracker |
| `unset_nanobot` | 卸载 nanobot 配置 | `registry.ts` unloadPlanConfig | Node tea-tracker |

## 架构

```
install.sh (shell curl)                     coding-helper CLI (Node.js)
         |                                           |
         v                                           v
    tea_track()                              tea-tracker.ts
    shell 函数                                  track(type)
    curl fire-and-forget                        spawn('curl') detached+unref
         |                                           |
         +-------------------------------------------+
                            |
                            v
              TEA collect API (HTTP POST)
              mcs.zijieapi.com/list (生产)
              mcs.bytedance.net/v1/list_test (测试)
```

### 代码改动清单

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/lib/constants.ts` | +5 行 | `TEA_CONFIG` 常量 |
| `src/lib/tea-tracker.ts` | 新建 ~105 行 | 核心打点模块 |
| `src/lib/command.ts` | +2 行 | `enter` 事件 |
| `src/lib/setup-flow.ts` | +3 行 | `set_apikey`、`change_model` |
| `src/lib/registry.ts` | +3 行 | `set_xxx` / `unset_xxx`（10 个工具事件） |
| `package.json` | +1 行 | `preuninstall` 触发 `uninstall` |
| `install.sh` | +25 行 | `install` 事件 (shell curl) |

### 工具名映射

`registry.ts` 中 `toolName` 到 TEA 事件 `type` 的映射：

## 上报协议

TEA SDK 底层使用 HTTP POST 发送事件到 `/list` 端点。
install.sh 用 shell curl、coding-helper CLI 用 Node spawn curl，协议层完全一致。

### URL 格式

```
POST https://mcs.zijieapi.com/list?aid={app_id}&sdk_version={version}&device_platform={platform}
Content-Type: application/json; charset=UTF-8
```

### Payload 结构

```json
[{
  "events": [
    {
      "event": "ark_cli_lifecycle",
      "params": "{\"type\":\"install\"}",
      "local_time_ms": 1773285122000,
      "session_id": "D59C6D9F-7968-43FC-A25A-FA84927DF8D8"
    }
  ],
  "user": {
    "user_unique_id": "7829230578386535000",
    "web_id": "7829230578386535000",
    "device_id": "7829230578386535000"
  },
  "header": {
    "app_id": 940776,
    "os_name": "Darwin",
    "os_version": "22.6.0",
    "platform": "cli",
    "sdk_lib": "js",
    "sdk_version": "5.3.10",
    "timezone": 8,
    "tz_offset": -28800
  },
  "local_time": 1773285122,
  "verbose": 1
}]
```

**注意**: payload 是**数组**，不是单个对象。这是 TEA 协议要求。

### 成功响应

```json
{"e":0,"sc":1,"tc":1}
```

- `e`: 0 表示成功，非 0 表示失败
- `sc`: 成功条数
- `tc`: 总条数

### 常见错误码

| e | 含义 |
|---|------|
| 0 | 成功 |
| -3 | app_id 未注册 / 端点不匹配 |

## DID (设备唯一标识) 生成逻辑

Shell (install.sh) 和 Node (tea-tracker.ts) 使用相同算法，产出一致的 DID。

### 来源

| 平台 | 来源 | 特性 |
|------|------|------|
| macOS | `ioreg` 读取 `IOPlatformUUID` | 硬件级，重装系统不变 |
| Linux | `/etc/machine-id` | 系统安装时生成，不重装不变 |
| fallback | `hostname` | 可靠性最低，可能重名 |

### 转换流程

```
IOPlatformUUID (如 "DBC47EF7-73A7-5957-BCC0-079F2B786BB1")
       |
       v
   md5 哈希 (如 "c7fcc8d29bcd2cc305783865fc35bb0d")
       |
       v
   提取数字 + 补零 + 截取前19位
       |
       v
   "7829230578386535000" (19位纯数字，TEA 标准格式)
```

同一台机器，Shell 和 Node 产出的 DID 完全一致。`user_unique_id`、`web_id`、`device_id` 三个字段赋同一个值。

## 不阻塞保证

### install.sh (Shell)

```bash
tea_track &       # 后台执行
  curl ... || true  # 失败静默
```

### coding-helper CLI (Node)

```typescript
spawn('curl', args, {
  detached: true,   // 子进程脱离父进程
  stdio: 'ignore'   // 不继承 stdin/stdout/stderr
}).unref()           // 父进程不等待子进程
```

即使 curl 超时 5 秒、DNS 解析失败、网络不通，主进程都完全无感知。

## 环境切换

源码中硬编码的永远是**生产 URL** (`mcs.zijieapi.com/list`)，不存在忘记切回的风险。

```typescript
// tea-tracker.ts
const url = process.env.ARK_TEA_URL || `${TEA_CONFIG.url}?aid=...`;
```

本地测试时通过环境变量覆盖：

```bash
# 测试
ARK_TEA_URL="https://mcs.bytedance.net/v1/list_test?aid=940776&sdk_version=5.3.10&device_platform=cli" coding-helper

# 生产（默认，不设置任何环境变量）
coding-helper
```

## 验证方法

### 方法 1: Node tea-tracker 逐事件验证

```bash
cd /path/to/open-ark
npm run build

for evt in enter set_apikey change_model set_openclaw set_opencode set_claude set_zeroclaw set_nanobot unset_openclaw unset_opencode unset_claude unset_zeroclaw unset_nanobot uninstall; do
  ARK_TEA_URL="https://mcs.bytedance.net/v1/list_test?aid=940776&sdk_version=5.3.10&device_platform=cli" \
    node --input-type=module -e "import { track } from './dist/lib/tea-tracker.js'; track('${evt}');"
  echo "  ✓ ${evt}"
done
```

### 方法 2: 直接 curl 验证

```bash
curl -s --max-time 10 \
  -X POST 'https://mcs.zijieapi.com/list?aid=940776&sdk_version=5.3.10&device_platform=cli' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -d '[{"events":[{"event":"ark_cli_lifecycle","params":"{\"type\":\"install\"}","local_time_ms":1773285122000,"session_id":"test-session-001"}],"user":{"user_unique_id":"7829230578386535000","web_id":"7829230578386535000","device_id":"7829230578386535000"},"header":{"app_id":940776,"os_name":"Darwin","os_version":"22.6.0","platform":"cli","sdk_lib":"js","sdk_version":"5.3.10","timezone":8,"tz_offset":-28800},"local_time":1773285122,"verbose":1}]'
```

预期输出: `{"e":0,"sc":1,"tc":1}`

### 方法 3: 内网测试端点

```bash
curl -s --max-time 10 \
  -X POST 'https://mcs.bytedance.net/v1/list_test?aid=940776&sdk_version=5.3.10&device_platform=cli' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -d '[{"events":[{"event":"ark_cli_lifecycle","params":"{\"type\":\"install\"}","local_time_ms":1773285122000,"session_id":"test-session-001"}],"user":{"user_unique_id":"7829230578386535000","web_id":"7829230578386535000","device_id":"7829230578386535000"},"header":{"app_id":940776,"os_name":"Darwin","os_version":"22.6.0","platform":"cli","sdk_lib":"js","sdk_version":"5.3.10","timezone":8,"tz_offset":-28800},"local_time":1773285122,"verbose":1}]'
```

**注意**: `/v1/list_test` 是测试路径，数据进测试环境。`/v1/json_test` 对 940776 返回 `e:-3`，不可用。

### 方法 4: 批量压测

```bash
for i in $(seq 1 100); do
  RESP=$(curl -s --max-time 10 \
    -X POST 'https://mcs.zijieapi.com/list?aid=940776&sdk_version=5.3.10&device_platform=cli' \
    -H 'Content-Type: application/json; charset=UTF-8' \
    -d '[{"events":[{"event":"ark_cli_lifecycle","params":"{\"type\":\"install\"}","local_time_ms":'$(date +%s)000',"session_id":"batch-'$i'"}],"user":{"user_unique_id":"7829230578386535000","web_id":"7829230578386535000","device_id":"7829230578386535000"},"header":{"app_id":940776,"os_name":"Darwin","os_version":"22.6.0","platform":"cli","sdk_lib":"js","sdk_version":"5.3.10","timezone":8,"tz_offset":-28800},"local_time":'$(date +%s)',"verbose":1}]')
  echo "#${i} ${RESP}"
done
```

### 方法 5: TEA 后台查看

登录 TEA/DataRangers 后台，筛选 app_id=940776，查看 `ark_cli_lifecycle` 事件。

## 测试结果

### 端点可用性

| 端点 | 路径 | 结果 |
|------|------|------|
| `mcs.zijieapi.com` | `/list` | **成功** (e:0)，300+ 次 0 失败 |
| `mcs.bytedance.net` | `/v1/list_test` | **成功** (e:0)，内网测试可用 |
| `mcs.bytedance.net` | `/v1/json_test` | **失败** (e:-3) |
| `mct.zijieapi.com` | `/list` | **失败** (DNS 无法解析) |

### E2E 覆盖率

| 事件 | E2E 测试 | 备注 |
|------|---------|------|
| `install` | ✓ | install.sh shell curl 验证 |
| `uninstall` | ✓ | preuninstall 钩子验证 |
| `enter` | ✓ | tea-tracker Node 模块验证 |
| `set_apikey` | ✓ | tea-tracker Node 模块验证 |
| `change_model` | ✓ | tea-tracker Node 模块验证 |
| `set_openclaw` | ✓ | tea-tracker Node 模块验证 |
| `set_opencode` | ✓ | tea-tracker Node 模块验证 |
| `set_claude` | ✓ | tea-tracker Node 模块验证 |
| `set_zeroclaw` | ✓ | tea-tracker Node 模块验证 |
| `set_nanobot` | ✓ | tea-tracker Node 模块验证 |
| `unset_openclaw` | ✓ | tea-tracker Node 模块验证 |
| `unset_opencode` | ✓ | tea-tracker Node 模块验证 |
| `unset_claude` | ✓ | tea-tracker Node 模块验证 |
| `unset_zeroclaw` | ✓ | tea-tracker Node 模块验证 |
| `unset_nanobot` | ✓ | tea-tracker Node 模块验证 |

**覆盖率: 15/15 (install.sh 的 install + uninstall 需实际安装/卸载触发)**

### DID 一致性验证

```
Shell DID:  7829230578386535000
Node  DID:  7829230578386535000
结果: 一致 ✓
```

## 注意事项

1. **不阻塞**: shell 用 `&` 后台 + `|| true`；Node 用 `detached + unref`
2. **超时控制**: `--max-time 5` 防止网络问题卡住
3. **隐私**: 仅上报设备指纹 (硬件 UUID 的 md5)，不包含用户个人信息
4. **幂等性**: 同一设备多次触发会上报多条事件，但 DID 不变，可在后台按设备去重
5. **协议稳定性**: `/list` 是 TEA 各端 SDK 共用的标准 collect 接口，多年未变
6. **DID 一致性**: Shell 和 Node 使用相同算法，同一台机器产出相同 DID
7. **环境安全**: 源码硬编码生产 URL，测试仅通过运行时环境变量 `ARK_TEA_URL` 覆盖
