# AI App Configurator - Architect Console

一个基于 React + TypeScript + Tailwind CSS 的桌面应用，用于集中管理多个 AI 应用的配置。

## 设计系统

本项目采用 "The Precision Dashboard" 设计系统，主要特点：

### 颜色方案
- **主色调**: Deep Slate & Electric Blue (#0040e0, #2e5bff)
- **表面层次**: 通过背景色变化 (#faf8ff → #ffffff) 创建视觉层次
- **无边框原则**: 使用背景色差异而非边框来分隔区域

### 字体
- **标题**: Manrope - 用于大标题和数据展示
- **正文**: Inter - 用于数据密集区域和标签

### 特色交互
- **Haptic Hover**: 悬停时元素轻微上浮 (2px Y轴位移)
- **渐变按钮**: 主要按钮使用渐变色 (primary → primary-container)
- **毛玻璃效果**: 浮动元素使用 backdrop-blur

## 项目结构

```
src/
├── App.tsx                          # 主应用组件，路由控制
├── main.tsx                         # 应用入口
├── main.css                         # 全局样式和设计系统变量
└── components/
    ├── Layout.tsx                   # 布局组件（侧边栏 + 顶栏）
    ├── Dashboard.tsx                # 应用列表页面（主页）
    ├── EditConfiguration.tsx        # 应用配置编辑页面
    ├── GlobalApiKeys.tsx           # API 密钥管理页面
    └── UsageAnalytics.tsx          # 使用分析页面
```

## 功能页面

### 1. Dashboard (主页)
- 展示 10 个 AI 应用的状态
- 卡片式布局，区分已连接/未配置状态
- 支持快速配置入口

### 2. Edit Configuration
- 编辑应用的 Provider 配置
- API Key 管理（加密显示）
- 模型选择
- 系统健康监控

### 3. Global API Keys
- 统一管理所有 Provider 的 API 密钥
- 表格展示密钥状态和使用情况
- 安全提示和操作日志导出

### 4. Usage Analytics
- 可视化展示 API 使用量
- 柱状图展示各应用的 Token 消耗
- 成本估算和效率评分
- 应用性能详细表格

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 构建 macOS 应用
pnpm mac
```

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 样式系统
- **Vite** - 构建工具
- **Tauri** - 桌面应用框架

## 设计原则

1. **最小化边框**: 使用背景色层次创建视觉结构
2. **响应式交互**: 所有可交互元素都有悬停和点击反馈
3. **一致性**: 遵循统一的间距、圆角和颜色系统
4. **可访问性**: 保持高对比度和清晰的视觉层次

## Material Symbols 图标

项目使用 Google Material Symbols 图标字体，通过 CSS 自动加载。使用方式：

```tsx
<span className="material-symbols-outlined">icon_name</span>
```

## 浏览器支持

- Chrome/Edge (最新版)
- Firefox (最新版)
- Safari (最新版)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT
