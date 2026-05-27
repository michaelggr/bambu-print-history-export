# 微信小程序版设计文档

> 日期: 2026-05-27
> 状态: ✅ 已批准

## 一、项目概述

将 `bambu-export-web`（Bambu Lab 打印历史导出工具）移植为**微信小程序**，采用 **Monorepo + Taro + React** 架构，复用现有后端 API，实现全功能覆盖。

### 核心决策

| 决策项 | 选择 |
|--------|------|
| 功能范围 | 全功能版（登录+历史+统计+导出+设置） |
| 技术方案 | Taro 3.x + React + TypeScript |
| 架构模式 | Monorepo（pnpm workspaces） |
| 后端方案 | 复用现有 Express 后端 |
| 登录方式 | Bambu 账号登录（验证码/密码） |

## 二、Monorepo 项目结构

```
bambu-export/
├── packages/
│   ├── shared/                    # 共享包
│   │   ├── src/
│   │   │   ├── api.ts            # 统一 API 封装
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── format.ts         # 格式化函数
│   │   │   └── constants.ts      # 常量定义
│   │   └── package.json
│   │
│   ├── web/                       # Web 端（从 bambu-export-web 迁移）
│   │   ├── src/                  # 现有 React 代码
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── weapp/                     # 小程序端（新建）
│       ├── src/
│       │   ├── app.config.ts     # 全局配置
│       │   ├── app.tsx           # 入口
│       │   └── pages/
│       │       ├── login/        # 登录页
│       │       ├── history/      # 历史记录
│       │       ├── stats/        # 统计分析
│       │       ├── export/       # 数据导出
│       │       └── settings/     # 系统设置
│       ├── config/index.ts       # Taro 配置
│       └── package.json
│
├── api/                          # Express 后端（不变）
├── pnpm-workspace.yaml
└── package.json
```

## 三、共享包设计 (packages/shared)

### 3.1 API 封装

```typescript
// 根据 platform 自动选择请求方式
// Web: fetch('/api/...')
// 小程序: Taro.request({ url: BASE_URL + '/api/...' })

export const api = {
  sendCode(account): Promise<Result>
  loginWithCode(account, code): Promise<TokenResult>
  loginWithPassword(account, password): Promise<TokenResult>
  logout(): Promise<void>
  getHistory(page, pageSize, filters?): Promise<PaginatedResult<PrintRecord>>
  getStats(): Promise<StatsData>
  exportData(format, filters?): Promise<ExportResult>
  getSettings(): Promise<Settings>
  updateSettings(patch): Promise<Result>
  clearCache(): Promise<Result>
  clearAll(): Promise<Result>
};
```

### 3.2 类型定义

```typescript
// PrintRecord - 打印记录
// StatsData - 统计数据结构
// Settings - 设置项
// ApiResponse<T> - 统一响应格式
// FilterOptions - 筛选条件
```

## 四、小程序页面设计

### 4.1 页面清单

| 页面 | 路径 | 功能说明 |
|------|------|----------|
| 登录页 | /pages/login | 账号输入 → 验证码/密码登录 |
| 历史记录 | /pages/history | 列表 + 筛选(状态/日期) + 下拉刷新 + 分页 |
| 统计分析 | /pages/stats | 终身/7天/30天 卡片 + ECharts 图表 |
| 数据导出 | /pages/export | 格式选择(JSON/CSV/HA) → 导出 → 分享文件 |
| 系统设置 | /pages/settings | 版本信息、缓存管理、登出、关于链接 |

### 4.2 TabBar 配置

```
底部导航：历史记录 | 统计分析 | 数据导出
（登录和设置通过右上角菜单进入）
```

### 4.3 页面交互流程

```
启动 → 检查登录状态
  ├─ 未登录 → 跳转登录页
  │    └─ 输入账号 → 发送验证码 → 登录成功 → 进入主页
  │
  └─ 已登录 → 历史记录页（主页）
       ├─ 下拉刷新 → 重新拉取最新数据
       ├─ 上拉加载 → 分页加载更多
       ├─ 点击筛选 → 按状态/日期筛选
       ├─ 点击记录 → 详情弹窗（封面图+详情信息）
       ├─ 切换 Tab → 统计/导出页面
       └─ 右上角菜单 → 设置/登出
```

## 五、技术栈

| 层 | 选型 | 版本 |
|----|------|------|
| 框架 | Taro | 3.x |
| UI 库 | NutUI (@nutui/nutui-taro) | 3.x |
| 图表 | echarts4taro3 | latest |
| 状态管理 | zustand | 5.x |
| HTTP | Taro.request | 内置 |
| 样式 | SCSS + CSS Variables | - |
| 包管理 | pnpm | 9.x |
| 构建 | @tarojs/webpack-runner | 内置 |

## 六、后端复用策略

- 后端代码完全不动，部署到公网可访问地址
- 小程序通过 `BASE_URL` 环境变量指向后端
- Token 存储在 `Taro.setStorageSync('token', xxx)`
- CORS 已在 Express 中全局开启

## 七、开发阶段

### P1：基础框架（当前）
- [ ] 初始化 Monorepo 结构
- [ ] 创建 packages/shared 共享包
- [ ] 初始化 Taro 项目 (packages/weapp)
- [ ] 迁移 Web 端到 packages/web
- [ ] 配置 pnpm workspace
- [ ] 验证 Web 端构建正常

### P2：核心功能
- [ ] 实现登录页（验证码+密码）
- [ ] 实现历史记录列表页
- [ ] 实现筛选和分页
- [ ] 实现下拉刷新
- [ ] Token 持久化存储

### P3：统计导出
- [ ] 实现统计页（卡片数据）
- [ ] 接入 ECharts 图表
- [ ] 实现导出页（格式选择）
- [ ] 文件分享功能
- [ ] 实现设置页

### P4：优化发布
- [ ] 黑猫警长 Logo 适配
- [ ] 性能优化（分包加载）
- [ ] 真机调试测试
- [ ] 提交微信审核
