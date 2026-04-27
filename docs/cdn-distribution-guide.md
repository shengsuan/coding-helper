# CDN 分发 npm 包方案

## 背景

当一个 npm 包发布在内部 registry（如 `bnpm.byted.org`）上，外部用户无法通过 `npm install` 直接安装。
本方案通过 **CDN 托管包体 + 公网 npm 拉取依赖** 的方式，实现无需内部 registry 权限的安装。

## 原理

```
正常流程 (需要内部 registry):
  npm install @scope/pkg -g
       |
       +-- registry (bnpm) --> 包体 + 依赖   <-- 外部不可访问

CDN 分发流程:
  curl | sh
       |
       +-- CDN -----------> 包体 (.tgz)     <-- 公网可访问
       +-- npmjs.org -----> 依赖             <-- 公网可访问
```

### 安装时序图

```
  用户终端                    CDN                        npmjs.org
     |                        |                            |
     |  curl install.sh       |                            |
     |----------------------->|                            |
     |  <--- install.sh 脚本  |                            |
     |                        |                            |
     |  curl pkg-x.y.z.tgz   |                            |
     |----------------------->|                            |
     |  <--- .tgz 包体        |                            |
     |                        |                            |
     |  npm install .tgz -g --registry npmjs.org           |
     |  (1) 解压 .tgz，读取 package.json                    |
     |  (2) 解析 dependencies                               |
     |                        |                            |
     |  GET dependencies + 子依赖                           |
     |---------------------------------------------------->|
     |  <-------------------------------- 依赖包 (.tgz)    |
     |                        |                            |
     |  (3) 安装到全局 node_modules                         |
     |  (4) 创建 bin 软链接                                 |
     |                        |                            |
     |  安装完成 ✓             |                            |
     v                        v                            v
```

### 前提条件

- 包的所有 `dependencies` 都能在公网 npmjs.org 找到
- 包本身没有依赖其他内部包（如 `@byted-*`、`@bytedance/*`）

## 实现步骤

### 1. 构建并打包 .tgz

```bash
cd ~/code/your-package
npm run build
npm pack
# 产出: scope-name-x.y.z.tgz
```

`npm pack` 做的事情：
- 读取 `package.json` 的 `files` 字段（或 `.npmignore`）决定打包哪些文件
- 打包为标准 npm tarball 格式：所有文件放在 `package/` 目录下
- 不包含 `node_modules`，只有源码/构建产物 + `package.json`

### 2. 上传 .tgz 到 CDN

将生成的 `.tgz` 上传到任意文件托管服务，拿到公网可访问的 URL。

常见选择：
- 飞书文档附件 → `sf3-cn.feishucdn.com`
- 静态资源 → `lf3-static.bytednsdoc.com`
- AWS S3 / 阿里云 OSS 等

### 3. 编写 install.sh

```bash
#!/bin/sh
set -e

PKG_URL="https://your-cdn.com/path/to/pkg-x.y.z.tgz"
TMP_FILE="$(mktemp /tmp/pkg-XXXXXX.tgz)"

cleanup() { rm -f "$TMP_FILE"; }
trap cleanup EXIT

echo "Downloading package..."
curl -fsSL -o "$TMP_FILE" "$PKG_URL"

echo "Installing package..."
npm install "$TMP_FILE" -g --registry https://registry.npmjs.org

echo "Done! Run 'your-command --version' to verify."
```

关键点：
- `set -e`：任何命令失败立即退出
- `mktemp`：创建临时文件，避免路径冲突
- `trap cleanup EXIT`：无论成功/失败都清理临时文件
- `--registry https://registry.npmjs.org`：确保依赖从公网拉取，不修改用户的 npm 配置

### 4. 上传 install.sh 到 CDN

将 `install.sh` 同样上传到 CDN，拿到 URL。

### 5. 用户使用

```bash
curl -fsSL https://your-cdn.com/path/to/install.sh | sh
```

## npm install .tgz 的内部流程

```
npm install /tmp/pkg.tgz -g
     |
     +-- 1. 解压 .tgz
     +-- 2. 读取 package.json
     |       - 识别 name, version
     |       - 识别 dependencies
     |       - 识别 bin 字段
     +-- 3. 从 registry 下载 dependencies（及其子依赖）
     +-- 4. 安装到全局 node_modules
     |       例: /usr/local/lib/node_modules/@scope/pkg/
     +-- 5. 根据 bin 字段创建软链接
             例: /usr/local/bin/your-command -> .../dist/cli.js
```

## 版本更新流程

```
1. 修改代码，bump package.json version
2. npm run build && npm pack        --> 新的 .tgz
3. 上传新 .tgz 到 CDN
4. 修改 install.sh 中的 PKG_URL     --> 指向新版本
5. 上传新 install.sh 到 CDN（覆盖旧的）
```

## 实际案例

### 本项目 (coding-helper)

```
包名:       @coohu/coding-helper
内部源:     bnpm.byted.org
包体 CDN:   https://lf3-static.bytednsdoc.com/obj/eden-cn/nupxpguhm/coohu-coding-helper-1.1.7.tgz
安装脚本:   https://lf3-static.bytednsdoc.com/obj/eden-cn/nupxpguhm/install.sh
安装命令:   curl -fsSL https://lf3-static.bytednsdoc.com/obj/eden-cn/nupxpguhm/install.sh | sh
```

### 飞书 OpenClaw 插件

```
包名:       @lark-open/feishu-plugin-onboard-cli
内部源:     bnpm.byted.org
包体 CDN:   https://sf3-cn.feishucdn.com/obj/open-platform-opendoc/...tgz
安装方式:   手动三步 (curl + npm install)
```

## 与其他分发方式对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| 公网 npm 发布 | 标准、自动解析依赖 | 需要公网 scope 权限 |
| 内部 npm (bnpm) | 与现有流程一致 | 外部用户无法访问 |
| **CDN + install.sh** | **无需 registry 权限，一行安装** | **手动管理版本，无自动更新** |
| GitHub Releases | 有版本管理 | 需要 GitHub 访问权限 |

## 注意事项

1. **依赖检查**：发布前确认所有 dependencies 都在公网 npmjs.org 可用
2. **版本同步**：install.sh 中的 URL 需手动与 package.json version 保持一致
3. **安全性**：`curl | sh` 模式要求用户信任 CDN 来源，建议提供 checksum 校验
4. **卸载**：用户通过 `npm uninstall -g @scope/pkg` 卸载
