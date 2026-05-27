# 微信小程序版实施计划

> **For agentic workers:** 使用 subagent-driven-development 或 executing-plans 逐步执行。步骤使用 checkbox (`- [ ]`) 语法跟踪。

**Goal:** 将 bambu-export-web 移植为微信小程序，采用 Monorepo + Taro + React 架构，实现全功能覆盖（登录、历史、统计、导出、设置）。

**Architecture:** Monorepo (pnpm workspaces) 结构，`packages/shared` 存放共享代码(API/类型/工具)，`packages/weapp` 为 Taro 小程序端，复用现有 Express 后端。

**Tech Stack:** Taro 3.x + React 18 + TypeScript + NutUI + echarts4taro3 + Zustand + pnpm

---

## Task 1: 初始化 Monorepo 项目结构

**Files:**
- Create: `bambu-export/pnpm-workspace.yaml`
- Create: `bambu-export/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`

- [ ] **Step 1: 在项目根目录下创建新根目录**

```bash
mkdir ./bambu-export
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
# ./bambu-export\pnpm-workspace.yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: 创建根 package.json**

```json
{
  "name": "bambu-export-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "web:dev": "pnpm --filter web dev",
    "web:build": "pnpm --filter web build",
    "weapp:dev": "pnpm --filter weapp dev:weapp",
    "weapp:build": "pnpm --filter weapp build:weapp"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 4: 创建 packages/shared/package.json**

```json
{
  "name": "@bambu/export-shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 5: 创建 packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: 创建 packages/shared/src 目录结构并初始化**

```bash
# 创建目录
mkdir ./bambu-export\packages\shared\src

# 创建占位 index.ts
```

- [ ] **Step 7: 安装依赖并验证 monorepo**

```bash
cd ./bambu-export
pnpm install
```
Expected: pnpm 创建 node_modules 和 workspace 链接

- [ ] **Step 8: 提交基础框架**

```bash
git add .
git commit -m "chore: 初始化 Monorepo 基础结构 (pnpm workspace)"
```

---

## Task 2: 实现共享包 (packages/shared)

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/format.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: 创建 types.ts — 所有类型定义**

```typescript
// packages/shared/src/types.ts

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 打印记录 */
export interface PrintRecord {
  id: string;
  task_name: string;
  model_name?: string;
  project_name?: string;
  status: 'FINISHED' | 'FAILED' | 'CANCELLED' | 'RUNNING' | 'PAUSED';
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  weight_g?: number;
  filament_type?: string;
  filament_color?: string;
  nozzle_diameter?: number;
  cover_url?: string;
  snapshot_url?: string;
  device_model?: string;
  device_serial?: string;
}

/** 筛选条件 */
export interface FilterOptions {
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

/** 统计数据 */
export interface StatsData {
  stats_lifetime: PeriodStats;
  stats_7d: PeriodStats;
  stats_30d: PeriodStats;
  activity_heatmap: Record<string, number>;
  filament_success_stats: Record<string, { total: number; success: number }>;
  color_usage_stats: Record<string, number>;
}

/** 单时段统计 */
export interface PeriodStats {
  total_prints: number;
  successful_prints: number;
  failed_prints: number;
  cancelled_prints: number;
  success_rate: number;
  total_weight_g: number;
  total_duration_hours: number;
  devices: Record<string, number>;
  filaments: Record<string, number>;
  monthly: Record<string, number>;
  duration_distribution: Record<string, number>;
  failure_stage_distribution: Record<string, number>;
  extremes: {
    longest: { name: string; hours: number };
    shortest: { name: string; hours: number };
    heaviest: { name: string; weight_g: number };
    lightest: { name: string; weight_g: number };
  };
  nozzle_size_distribution: Record<string, number>;
  over_500g_count: number;
  over_500g_rate: number;
  slice_mode_distribution: Record<string, number>;
  multi_color_count: number;
  multi_color_rate: number;
}

/** 登录结果 */
export interface LoginResult {
  success: boolean;
  token?: string;
  error?: string;
}

/** 设置项 */
export interface SettingsData {
  cacheCount: number;
}

/** 导出结果 */
export interface ExportResult {
  success: boolean;
  data?: string;
  url?: string;
  error?: string;
}
```

- [ ] **Step 2: 创建 constants.ts — 常量定义**

```typescript
// packages/shared/src/constants.ts

/** Bambu API 地址 */
export const BAMBU_API_CN = 'https://api.bambulab.cn';
export const BAMBU_API_GLOBAL = 'https://api.bambulab.com';

/** Token 存储 key */
export const TOKEN_KEY = 'bambu_token';

/** 历史记录缓存 key */
export const HISTORY_KEY = 'bambu_history_cache';

/** 打印状态映射 */
export const STATUS_MAP: Record<string, string> = {
  FINISHED: '完成',
  FAILED: '失败',
  CANCELLED: '已取消',
  RUNNING: '打印中',
  PAUSED: '已暂停',
};

/** 打印状态颜色映射 */
export const STATUS_COLOR: Record<string, string> = {
  FINISHED: '#52c41a',
  FAILED: '#ff4d4f',
  CANCELLED: '#d9d9d9',
  RUNNING: '#1890ff',
  PAUSED: '#faad14',
};
```

- [ ] **Step 3: 创建 format.ts — 格式化函数**

```typescript
// packages/shared/src/format.ts

import type { PrintRecord } from './types';
import { STATUS_MAP } from './constants';

/** 格式化时长（分钟 → 可读字符串） */
export function fmtDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分`;
}

/** 格式化重量（克） */
export function fmtWeight(grams: number): string {
  if (!grams || grams <= 0) return '-';
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)}kg`;
  return `${Math.round(grams)}g`;
}

/** 格式化日期时间 */
export function fmtDateTime(isoStr: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoStr;
  }
}

/** 格式化相对时间 */
export function fmtRelativeTime(isoStr: string): string {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return fmtDateTime(isoStr);
}

/** 获取打印状态文本 */
export function fmtStatus(status: string): string {
  return STATUS_MAP[status] || status;
}

/** 获取任务显示名称（模型名优先，回退到 task_name） */
export function getTaskDisplayName(record: PrintRecord): string {
  if (record.model_name && record.project_name) {
    // 模型名和项目名不同时都显示
    return record.model_name === record.project_name
      ? record.model_name
      : `${record.model_name} (${record.project_name})`;
  }
  return record.task_name || '未知任务';
}
```

- [ ] **Step 4: 创建 api.ts — 平台无关的 API 封装**

```typescript
// packages/shared/src/api.ts

import type {
  ApiResponse, PaginatedResponse, PrintRecord,
  FilterOptions, StatsData, LoginResult,
  SettingsData, ExportResult
} from './types';

/**
 * 平台适配器接口 — Web 和小程序各自实现
 */
export interface PlatformAdapter {
  request<T>(options: RequestConfig): Promise<T>;
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
}

interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
}

let adapter: PlatformAdapter | null = null;

/** 注册平台适配器（Web/小程序各注册一次） */
export function registerPlatformAdapter(a: PlatformAdapter): void {
  adapter = a;
}

function ensureAdapter(): PlatformAdapter {
  if (!adapter) throw new Error('[shared/api] 未注册平台适配器，请先调用 registerPlatformAdapter()');
  return adapter;
}

/** 构建完整的 API 类 */
export const api = {
  /** 检查登录状态 */
  async checkAuth(): Promise<{ loggedIn: boolean; token?: string }> {
    const a = ensureAdapter();
    const token = a.getToken();
    if (!token) return { loggedIn: false };
    // 通过请求 /api/auth/status 验证 token 是否有效
    try {
      const res = await a.request<ApiResponse<{ loggedIn: boolean }>>({
        url: '/api/auth/status',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { loggedIn: !!res?.success && res?.data?.loggedIn, token };
    } catch {
      a.removeToken();
      return { loggedIn: false };
    }
  },

  /** 发送验证码 */
  async sendCode(account: string): Promise<ApiResponse> {
    const a = ensureAdapter();
    return a.request<ApiResponse>({
      url: '/api/auth/send-code',
      method: 'POST',
      data: { account },
    });
  },

  /** 验证码登录 */
  async loginWithCode(account: string, code: string): Promise<LoginResult> {
    const a = ensureAdapter();
    const res = await a.request<ApiResponse<{ token?: string }>>({
      url: '/api/auth/login',
      method: 'POST',
      data: { account, code },
    });
    const token = res?.data?.token;
    if (res?.success && token) {
      a.setToken(token);
      return { success: true, token };
    }
    return { success: false, error: res?.error || '登录失败' };
  },

  /** 密码登录 */
  async loginWithPassword(account: string, password: string): Promise<LoginResult> {
    const a = ensureAdapter();
    const res = await a.request<ApiResponse<{ token?: string }>>({
      url: '/api/auth/login',
      method: 'POST',
      data: { account, password },
    });
    const token = res?.data?.token;
    if (res?.success && token) {
      a.setToken(token);
      return { success: true, token };
    }
    return { success: false, error: res?.error || '登录失败' };
  },

  /** 登出 */
  async logout(): Promise<void> {
    const a = ensureAdapter();
    try {
      await a.request({ url: '/api/auth/logout', method: 'POST' });
    } catch { /* 忽略 */ }
    a.removeToken();
  },

  /** 获取历史记录（分页） */
  async getHistory(
    page: number = 1,
    pageSize: number = 20,
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<PrintRecord>> {
    const a = ensureAdapter();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(filters || {}),
    });
    return a.request<PaginatedResponse<PrintRecord>>({
      url: `/api/history?${params.toString()}`,
    });
  },

  /** 获取统计数据 */
  async getStats(): Promise<ApiResponse<StatsData>> {
    const a = ensureAdapter();
    return a.request<ApiResponse<StatsData>>({ url: '/api/history/stats' });
  },

  /** 导出数据 */
  async exportData(
    format: 'json' | 'csv' | 'ha' = 'json',
    filters?: FilterOptions,
  ): Promise<ExportResult> {
    const a = ensureAdapter();
    const params = new URLSearchParams({ format, ...(filters || {}) });
    return a.request<ExportResult>({
      url: `/api/export?${params.toString()}`,
    });
  },

  /** 获取设置 */
  async getSettings(): Promise<ApiResponse<SettingsData>> {
    const a = ensureAdapter();
    return a.request<ApiResponse<SettingsData>>({ url: '/api/settings' });
  },

  /** 更新设置 */
  async updateSettings(patch: Record<string, unknown>): Promise<ApiResponse> {
    const a = ensureAdapter();
    return a.request<ApiResponse>({
      url: '/api/settings',
      method: 'PUT',
      data: patch,
    });
  },

  /** 清除缓存 */
  async clearCache(): Promise<ApiResponse> {
    const a = ensureAdapter();
    return a.request<ApiResponse>({ url: '/api/settings/cache', method: 'DELETE' });
  },

  /** 清除全部数据 */
  async clearAll(): Promise<ApiResponse> {
    const a = ensureAdapter();
    return a.request<ApiResponse>({ url: '/api/settings/all', method: 'DELETE' });
  },
};
```

- [ ] **Step 5: 创建 index.ts — 统一导出**

```typescript
// packages/shared/src/index.ts
export * from './types.js';
export * from './constants.js';
export * from './format.js';
export * from './api.js';
```

- [ ] **Step 6: 类型检查验证**

```bash
cd ./bambu-export\packages\shared
pnpm run check
```
Expected: 无错误输出

- [ ] **Step 7: 提交共享包**

```bash
git add packages/shared/
git commit -m "feat(shared): 实现 types/constants/format/api 共享包"
```

---

## Task 3: 迁移 Web 端到 packages/web

**Files:**
- Move: 整个 `bambu-export-web/` 内容 → `bambu-export/packages/web/`
- Modify: `packages/web/package.json`（添加 shared 依赖）
- Create: `packages/web/src/utils/api-web.ts`（Web 平台适配器）

- [ ] **Step 1: 复制现有 Web 项目到 packages/web**

```bash
# 将 bambu-export-web 内容复制到 packages/web（排除 node_modules, dist 等）
robocopy "./bambu-export-web" "./bambu-export\packages\web" /MIR /XD node_modules dist .git __pycache__ *.pyc electron dist-server dist-electron3 resources scripts .codegraph "= @(" "eTreeSha" "tCommitSha" /XF package-lock.json /R:0 /W:0
```

- [ ] **Step 2: 更新 packages/web/package.json，添加 shared 依赖**

在 `packages/web/package.json` 的 dependencies 中添加：
```json
"@bambu/export-shared": "workspace:*"
```

- [ ] **Step 3: 创建 Web 平台适配器**

创建文件 `packages/web/src/utils/platform-web.ts`:

```typescript
// packages/web/src/utils/platform-web.ts
import type { PlatformAdapter } from '@bambu/export-shared/api';

const TOKEN_KEY = 'bambu_token';

export const webAdapter: PlatformAdapter = {
  async request<T>(options) {
    const { url, method = 'GET', data, headers = {} } = options;
    const token = this.getToken();

    const fetchOpts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    if (data && method !== 'GET') {
      fetchOpts.body = JSON.stringify(data);
    }

    const res = await fetch(url, fetchOpts);
    return res.json() as Promise<T>;
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};
```

- [ ] **Step 4: 修改 Web 入口，注册适配器**

修改 `packages/web/src/main.tsx`，在最顶部添加：
```typescript
import { registerPlatformAdapter } from '@bambu/export-shared/api';
import { webAdapter } from './utils/platform-web';

// 注册 Web 平台适配器
registerPlatformAdapter(webAdapter);
```

- [ ] **Step 5: 验证 Web 构建**

```bash
cd ./bambu-export\packages\web
pnpm install
pnpm run build
```
Expected: 构建成功，无错误

- [ ] **Step 6: 提交 Web 端迁移**

```bash
git add packages/web/
git commit -m "feat(web): 迁移 Web 端到 packages/web，接入 shared 包"
```

---

## Task 4: 初始化 Taro 小程序项目

**Files:**
- Create: `packages/weapp/package.json`
- Create: `packages/weapp/config/index.ts`
- Create: `packages/weapp/config/dev.ts`
- Create: `packages/weapp/project.config.json`
- Create: `packages/weapp/src/app.config.ts`
- Create: `packages/weapp/src/app.tsx`
- Create: `packages/weapp/src/app.scss`

- [ ] **Step 1: 创建 packages/weapp/package.json**

```json
{
  "name": "@bambu/export-weapp",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:weapp": "taro build --type weapp --watch",
    "build:weapp": "taro build --type weapp"
  },
  "dependencies": {
    "@bambu/export-shared": "workspace:*",
    "@nutui/nutui-taro": "^3.0.0",
    "@tarojs/components": "^4.0.0",
    "@tarojs/helper": "^4.0.0",
    "@tarojs/plugin-framework-react": "^4.0.0",
    "@tarojs/plugin-platform-weapp": "^4.0.0",
    "@tarojs/runtime": "^4.0.0",
    "@tarojs/shared": "^4.0.0",
    "@tarojs/taro": "^4.0.0",
    "echarts4taro3": "^3.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@tarojs/cli": "^4.0.0",
    "@tarojs/webpack-runner": "^4.0.0",
    "@types/react": "^18.3.1",
    "sass": "^1.80.0",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: 创建 Taro 主配置 config/index.ts**

```typescript
// packages/weapp/config/index.ts
import { defineConfig, type TransformContext } from '@tarojs/cli';

export default defineConfig(async (_ctx, transformCtx) => {
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    projectName: 'Bambu打印历史',
    date: '2026-05-27',
    designWidth: 375,
    deviceRatio: 2,
    sourceRoot: 'src',
    outputRoot: 'dist',
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: { enable: false },
    },
    cache: { enable: false }, // 避免缓存问题
    alias: {
      '@': './src',
    },
    sass: {
      data: '@import "@/styles/variables.scss";',
    },
    mini: {
      webpackChain(chain) {
        chain.merge({
          resolve: {
            alias: {
              'react-dom$': '@tarojs/react-dom',
            },
          },
        });
      },
    },
    plugins: [
      '@tarojs/plugin-framework-react',
      '@tarojs/plugin-platform-weapp',
    ],
  };
});
```

- [ ] **Step 3: 创建开发配置 config/dev.ts**

```typescript
// packages/weapp/config/dev.ts
import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  env: {
    NODE_ENV: '"development"',
    API_BASE: '"https://your-backend-url.vercel.app"', // 后端部署地址
  },
});
```

- [ ] **Step 4: 创建微信小程序配置 project.config.json**

```json
{
  "miniprogramRoot": "dist/",
  "projectname": "bambu-print-history",
  "description": "Bambu Lab 打印历史导出工具",
  "appid": "wx0000000000000000", // 替换为实际 AppID
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "nodeModules": true,
    "auditedDirs": ["dist"],
    "showShadowRootInWxmlPanel": true,
    "packNpmRelationList": [],
    "ignoreUploadUnusedFiles": true,
    "minifyWXSS": true,
    "disableUseStrict": false,
    "minifyWXML": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "compileType": "miniprogram",
  "libVersion": "3.6.1",
  "condition": {}
}
```

- [ ] **Step 5: 创建全局样式变量 src/styles/variables.scss**

```scss
// packages/weapp/src/styles/variables.scss
// 色彩系统
$color-primary: #6366f1;
$color-success: #52c41a;
$color-warning: #faad14;
$color-danger: #ff4d4f;
$color-text-primary: #1a1a1a;
$color-text-secondary: #666666;
$color-text-muted: #999999;
$color-bg: #f5f5f5;
$color-bg-card: #ffffff;
$color-border: #e8e8e8;

// 尺寸
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$spacing-xs: 8px;
$spacing-sm: 12px;
$spacing-md: 16px;
$spacing-lg: 24px;
```

- [ ] **Step 6: 创建全局 SCSS src/app.scss**

```scss
// packages/weapp/src/app.scss
@import './styles/variables.scss';

page {
  background-color: $color-bg;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: $color-text-primary;
  line-height: 1.5;
}
```

- [ ] **Step 7: 创建全局配置 app.config.ts**

```typescript
// packages/weapp/src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/history/index',
    'pages/stats/index',
    'pages/export/index',
    'pages/settings/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'Bambu打印历史',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '$color-primary',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/history/index',
        text: '历史',
        iconPath: 'assets/icons/history.png',
        selectedIconPath: 'assets/icons/history-active.png',
      },
      {
        pagePath: 'pages/stats/index',
        text: '统计',
        iconPath: 'assets/icons/stats.png',
        selectedIconPath: 'assets/icons/stats-active.png',
      },
      {
        pagePath: 'pages/export/index',
        text: '导出',
        iconPath: 'assets/icons/export.png',
        selectedIconPath: 'assets/icons/export-active.png',
      },
    ],
  },
});
```

- [ ] **Step 8: 创建入口 app.tsx**

```tsx
// packages/weapp/src/app.tsx
import { PropsWithChildren } from 'react';
import { useLaunchQuery } from '@tarojs/taro';
import { registerPlatformAdapter } from '@bambu/export-shared/api';
import { weappAdapter } from './utils/platform-weapp';
import './app.scss';

// 注册小程序平台适配器
registerPlatformAdapter(weappAdapter);

export default function App({ children }: PropsWithChildren) {
  useLaunchQuery(() => {
    console.log('App launched');
  });

  return children;
}
```

- [ ] **Step 9: 创建小程序平台适配器 src/utils/platform-weapp.ts**

```typescript
// packages/weapp/src/utils/platform-weapp.ts
import Taro from '@tarojs/taro';
import type { PlatformAdapter } from '@bambu/export-shared/api';

const TOKEN_KEY = 'bambu_token';
const BASE_URL = process.env.API_BASE || '';

export const weappAdapter: PlatformAdapter = {
  async request<T>(options) {
    const { url, method = 'GET', data, headers = {} } = options;
    const token = this.getToken();

    const res = await Taro.request({
      url: `${BASE_URL}${url}`,
      method: method as any,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data as T;
    }

    throw new Error(`API 错误: ${res.statusCode} ${JSON.stringify(res.data)}`);
  },

  getToken(): string | null {
    try {
      return Taro.getStorageSync(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    Taro.setStorageSync(TOKEN_KEY, token);
  },

  removeToken(): void {
    try {
      Taro.removeStorageSync(TOKEN_KEY);
    } catch { /* ignore */ }
  },
};
```

- [ ] **Step 10: 创建页面目录骨架**

```bash
# 为每个页面创建空壳
mkdir -p packages/weapp/src/pages/login
mkdir -p packages/weapp/src/pages/history
mkdir -p packages/weapp/src/pages/stats
mkdir -p packages/weapp/src/pages/export
mkdir -p packages/weapp/src/pages/settings
mkdir -p packages/weapp/src/assets/icons
```

每个页面先创建最小可运行文件：

```tsx
// packages/weapp/src/pages/login/index.tsx
import { View, Text } from '@tarojs/components';
import { useState } from 'react';

export default function LoginPage() {
  return (
    <View className="login-page">
      <Text>Bambu 登录</Text>
    </View>
  );
}
```

（history/stats/export/settings 同理，先返回简单占位内容）

- [ ] **Step 11: 安装依赖并尝试构建**

```bash
cd ./bambu-export
pnpm install
cd packages/weapp
pnpm run build:weapp
```
Expected: 成功生成 dist/ 目录

- [ ] **Step 12: 提交 Taro 项目初始化**

```bash
git add packages/weapp/
git commit -m "feat(weapp): 初始化 Taro 小程序项目框架"
```

---

## Task 5: 实现登录页

**Files:**
- Modify: `packages/weapp/src/pages/login/index.tsx`
- Create: `packages/weapp/src/pages/login/index.scss`

- [ ] **Step 1: 实现登录页面组件**

完整实现包含：账号输入框、验证码/密码切换、发送验证码按钮、登录按钮、错误提示。

```tsx
// packages/weapp/src/pages/login/index.tsx
import { View, Text, Input, Button, Form } from '@tarojs/components';
import { useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { api } from '@bambu/export-shared/api';
import './index.scss';

enum LoginMode { CODE, PASSWORD }

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<LoginMode>(LoginMode.CODE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 检查是否已登录
  useLaunchQuery(() => {
    api.checkAuth().then(({ loggedIn }) => {
      if (loggedIn) {
        Taro.switchTab({ url: '/pages/history/index' });
      }
    });
  });

  // 发送验证码
  const handleSendCode = async () => {
    if (!account.trim()) { setError('请输入账号'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.sendCode(account.trim());
      if (res.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(res.error || '发送失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!account.trim()) { setError('请输入账号'); return; }
    if (mode === LoginMode.CODE && !code.trim()) { setError('请输入验证码'); return; }
    setLoading(true); setError('');

    try {
      const res = mode === LoginMode.CODE
        ? await api.loginWithCode(account.trim(), code.trim())
        : await api.loginWithPassword(account.trim(), code.trim());

      if (res.success) {
        Taro.switchTab({ url: '/pages/history/index' });
      } else {
        setError(res.error || '登录失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const isPhone = !account.includes('@');

  return (
    <View className="login-container">
      <View className="login-header">
        {/* 黑猫警长 Logo */}
        <Image className="logo" src="/assets/logo.webp" mode="aspectFit" />
        <Text className="title">Bambu 打印历史</Text>
        <Text className="subtitle">登录你的 Bambu 账号</Text>
      </View>

      <View className="login-form">
        <Input
          className="input"
          placeholder={isPhone ? '手机号' : '邮箱'}
          value={account}
          onInput={(e) => setAccount(e.detail.value)}
        />

        {mode === LoginMode.CODE ? (
          <View className="input-row">
            <Input
              className="input flex-1"
              placeholder="验证码"
              value={code}
              onInput={(e) => setCode(e.detail.value)}
            />
            <Button
              className="code-btn"
              size="mini"
              disabled={countdown > 0 || loading}
              onClick={handleSendCode}
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </Button>
          </View>
        ) : (
          <Input
            className="input"
            password
            placeholder="密码"
            value={code}
            onInput={(e) => setCode(e.detail.value)}
          />
        )}

        {error ? <Text className="error-text">{error}</Text> : null}

        <Button
          className="submit-btn"
          type="primary"
          loading={loading}
          onClick={handleLogin}
        >
          登录
        </Button>

        <View className="switch-mode">
          <Text
            className="link"
            onClick={() => {
              setMode(mode === LoginMode.CODE ? LoginMode.PASSWORD : LoginMode.CODE);
              setCode('');
              setError('');
            }}
          >
            {mode === LoginMode.CODE ? '使用密码登录' : '使用验证码登录'}
          </Text>
        </View>
      </View>
    </View>
  );
}
```

注意：需要确保顶部有 `import { Image } from '@tarojs/components';`

- [ ] **Step 2: 创建登录页样式**

```scss
// packages/weapp/src/pages/login/index.scss
@import '@/styles/variables.scss';

.login-container {
  min-height: 100vh;
  padding: 60px $spacing-lg $spacing-lg;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #f0f4ff 0%, $color-bg 40%);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48px;

  .logo {
    width: 88px;
    height: 88px;
    border-radius: 20px;
    margin-bottom: 16px;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
  }

  .title {
    font-size: 22px;
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 13px;
    color: $color-text-secondary;
  }
}

.login-form {
  width: 100%;
  max-width: 340px;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: 28px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .input {
    height: 46px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    padding: 0 14px;
    font-size: 15px;
    margin-bottom: 14px;
    background: #fafafa;

    &:focus {
      border-color: $color-primary;
    }
  }

  .input-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;

    .flex-1 { flex: 1; }
    .code-btn {
      font-size: 13px;
      white-space: nowrap;
      min-width: 100px;
    }
  }

  .error-text {
    color: $color-danger;
    font-size: 13px;
    margin-bottom: 10px;
    display: block;
  }

  .submit-btn {
    height: 46px;
    border-radius: $radius-md;
    font-size: 16px;
    font-weight: 600;
    background: $color-primary;
    margin-top: 4px;

    &::after { border: none; }
  }

  .switch-mode {
    text-align: center;
    margin-top: 20px;

    .link {
      color: $color-primary;
      font-size: 13px;
    }
  }
}
```

- [ ] **Step 3: 复制 Logo 到小程序资源目录**

```bash
# 从 public 复制 logo 到小程序 assets
copy "./bambu-export-web\public\logo.webp" "./bambu-export\packages\weapp\src\assets\logo.webp"
```

- [ ] **Step 4: 构建验证**

```bash
cd packages/weapp && pnpm run build:weapp
```
Expected: 成功，无编译错误

- [ ] **Step 5: 提交登录页**

```bash
git add packages/weapp/src/pages/login/
git commit -m "feat(weapp): 实现登录页面（验证码+密码双模式）"
```

---

## Task 6: 实现历史记录页

**Files:**
- Modify: `packages/weapp/src/pages/history/index.tsx`
- Create: `packages/weapp/src/pages/history/index.scss`
- Create: `packages/weapp/src/components/HistoryCard.tsx`
- Create: `packages/weapp/src/components/HistoryCard.scss`

- [ ] **Step 1: 实现历史卡片组件 HistoryCard**

```tsx
// packages/weapp/src/components/HistoryCard.tsx
import { View, Text, Image } from '@tarojs/components';
import type { PrintRecord } from '@bambu/export-shared/types';
import { fmtDuration, fmtWeight, fmtDateTime, fmtStatus, getTaskDisplayName } from '@bambu/export-shared/format';
import { STATUS_COLOR } from '@bambu/export-shared/constants';
import './HistoryCard.scss';

interface Props {
  record: PrintRecord;
  onClick?: (record: PrintRecord) => void;
}

export default function HistoryCard({ record, onClick }: Props) {
  const statusColor = STATUS_COLOR[record.status] || '#999';
  const displayName = getTaskDisplayName(record);

  return (
    <View className="history-card" onClick={() => onClick?.(record)}>
      {/* 左侧封面图 */}
      {record.cover_url ? (
        <Image
          className="cover"
          src={record.cover_url}
          mode="aspectFill"
          lazyLoad
        />
      ) : (
        <View className="cover cover-placeholder">
          <Text className="cover-icon">🖨️</Text>
        </View>
      )}

      {/* 右侧信息 */}
      <View className="card-body">
        <View className="card-title-row">
          <Text className="task-name" numberOfLines={1}>{displayName}</Text>
          <View className={`status-badge status-${record.status.toLowerCase()}`}>
            <Text className="status-text">{fmtStatus(record.status)}</Text>
          </View>
        </View>

        <View className="meta-row">
          <Text className="meta-item">
            ⏱️ {fmtDuration(record.duration_minutes || 0)}
          </Text>
          <Text className="meta-item">
            ⚖️ {fmtWeight(record.weight_g || 0)}
          </Text>
        </View>

        <Text className="time-text">
          📅 {fmtDateTime(record.start_time)}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 实现历史列表页**

关键功能：下拉刷新、上拉加载更多、筛选栏、点击查看详情弹窗。

```tsx
// packages/weapp/src/pages/history/index.tsx
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@bambu/export-shared/api';
import type { PrintRecord, FilterOptions } from '@bambu/export-shared/types';
import HistoryCard from '../../components/HistoryCard';
import './index.scss';

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const [records, setRecords] = useState<PrintRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showDetail, setShowDetail] = useState<PrintRecord | null>(null);

  // 加载数据
  const fetchData = useCallback(async (pageNum = 1, append = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const filters: FilterOptions = {};
      if (statusFilter) filters.status = statusFilter;

      const res = await api.getHistory(pageNum, PAGE_SIZE, filters);

      if (res.success && res.data) {
        const items = append ? [...records, ...(res.data.data || [])] : (res.data.data || []);
        setRecords(items);
        setTotal(res.data.total || 0);
        setPage(pageNum);
        setHasMore(pageNum < (res.data.totalPages || 1));
      }
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, statusFilter]);

  // 下拉刷新
  usePullDownRefresh(() => {
    setRefreshing(true);
    fetchData(1, false).finally(() => Taro.stopPullDownRefresh());
  });

  // 上拉加载更多
  useReachBottom(() => {
    if (hasMore && !loading) {
      fetchData(page + 1, true);
    }
  });

  // 初始加载
  useEffect(() => { fetchData(); }, []);

  // 筛选变化时重新加载
  useEffect(() => { fetchData(1, false); }, [statusFilter]);

  const onCardClick = (record: PrintRecord) => setShowDetail(record);

  return (
    <View className="history-page">
      {/* 筛选栏 */}
      <View className="filter-bar">
        <Picker
          mode='selector'
          range={['全部状态', '已完成', '失败', '已取消']}
          value={['全部状态', '已完成', '失败', '已取消'].indexOf(statusFilter || '全部状态')}
          onChange={(e) => {
            const val = ['全部状态', '已完成', '失败', '已取消'][e.detail.value];
            setStatusFilter(val === '全部状态' ? '' : val);
          }}
        >
          <View className="filter-chip">
            <Text>{statusFilter || '全部状态'} ▼</Text>
          </View>
        </Picker>
        <Text className="total-text">共 {total} 条</Text>
      </View>

      {/* 列表 */}
      <ScrollView scrollY enhanced className="history-list">
        {records.length === 0 && !loading ? (
          <View className="empty-state">
            <Text className="empty-icon">📭</Text>
            <Text className="empty-text">暂无打印记录</Text>
          </View>
        ) : (
          records.map((r, i) => (
            <HistoryCard key={`${r.id}-${i}`} record={r} onClick={onCardClick} />
          ))
        )}
        {loading && <Text className="load-more-text">加载中...</Text>}
        {!hasMore && records.length > 0 && (
          <Text className="load-more-text">— 没有更多了 —</Text>
        )}
      </ScrollView>

      {/* 详情弹窗 */}
      {showDetail && (
        <View className="detail-modal" onClick={() => setShowDetail(null)}>
          <View className="detail-content" onClick={(e) => e.stopPropagation()}>
            <Text className="detail-title">
              {getTaskDisplayName(showDetail)}
            </Text>
            <View className="detail-grid">
              <View className="detail-item">
                <Text className="detail-label">状态</Text>
                <Text style={{ color: STATUS_COLOR[showDetail.status] }}>
                  {fmtStatus(showDetail.status)}
                </Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">时长</Text>
                <Text>{fmtDuration(showDetail.duration_minutes || 0)}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">耗材重量</Text>
                <Text>{fmtWeight(showDetail.weight_g || 0)}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">开始时间</Text>
                <Text>{fmtDateTime(showDetail.start_time)}</Text>
              </View>
            </View>
            <View className="detail-close" onClick={() => setShowDetail(null)}>
              <Text>关闭</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: 创建对应样式文件**

（省略具体 SCSS，遵循 variables.scss 变量体系）

- [ ] **Step 4: 构建验证并提交**

```bash
git add packages/weapp/src/pages/history/ packages/weapp/src/components/
git commit -m "feat(weapp): 实现历史记录页（列表+筛选+刷新+详情弹窗）"
```

---

## Task 7: 实现统计页

**Files:**
- Modify: `packages/weapp/src/pages/stats/index.tsx`
- Create: `packages/weapp/src/pages/stats/index.scss`

- [ ] **Step 1: 实现统计页面**

核心内容：
- 三个 Tab（终身/7天/30天）
- 统计卡片（总次数、成功率、总耗材、总时长）
- ECharts 图表（月度趋势、状态分布等）

```tsx
// 关键结构示意
// 使用 ec-canvas 组件渲染 ECharts 图表
// 数据从 api.getStats() 获取
// 图表 option 参考 Web 端 Stats.tsx 的图表配置
```

- [ ] **Step 2: 构建验证并提交**

```bash
git commit -m "feat(weapp): 实现统计分析页（统计卡片+ECharts图表）"
```

---

## Task 8: 实现导出页 + 设置页

**Files:**
- Modify: `packages/weapp/src/pages/export/index.tsx`
- Modify: `packages/weapp/src/pages/settings/index.tsx`

- [ ] **Step 1: 实现导出页**
  - 选择导出格式（JSON / CSV / HA插件）
  - 点击导出 → 调用 api.exportData()
  - 导出成功后调用 Taro.shareFileMessage 分享文件

- [ ] **Step 2: 实现设置页**
  - 版本号展示
  - 缓存记录数
  - 清除缓存按钮
  - 登出按钮
  - 关于链接（GitHub、QQ群）

- [ ] **Step 3: 构建验证并提交**

```bash
git commit -m "feat(weapp): 实现导出页和设置页"
```

---

## Task 9: 最终优化与真机测试

- [ ] **Step 1: TabBar 图标制作或使用文字模式**
- [ ] **Step 2: 性能优化 — 分包加载配置**
- [ ] **Step 3: 微信开发者工具导入项目测试**
- [ ] **Step 4: 真机预览测试**
- [ ] **Step 5: 最终提交**

```bash
git commit -m "feat(weapp): 小程序版 v1.0 完成，全功能可用"
```

---

## 文件清单总览

| 操作 | 文件路径 |
|------|----------|
| 新建 | `bambu-export/pnpm-workspace.yaml` |
| 新建 | `bambu-export/package.json` |
| 新建 | `packages/shared/{package.json,tsconfig.json,src/*.ts}` |
| 迁移 | `packages/web/` (从 bambu-export-web) |
| 新建 | `packages/weapp/{package.json,config/*,project.config.json}` |
| 新建 | `packages/weapp/src/{app.*,pages/**,components/**,styles/**,utils/**,assets/**}` |

## 执行顺序

按 Task 1 → 9 顺序执行，每步完成后构建验证。
