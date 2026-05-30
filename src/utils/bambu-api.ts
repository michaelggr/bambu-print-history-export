﻿﻿﻿﻿﻿﻿﻿﻿/**
 * Bambu Cloud API 调用层（纯前端）
 * 统一封装 Bambu Cloud API 的 HTTP 请求，支持三种运行环境：
 * - Electron: 通过 IPC 调用主进程的 Node.js https 模块（绕过 CORS）
 * - Capacitor (Android): 通过 CapacitorHttp 原生请求（绕过 CORS）
 * - Web 浏览器: 直接 fetch（需 Vite 代理或 Bambu API 开启 CORS）
 */

import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// API 常量
// ---------------------------------------------------------------------------

const API_CN = 'https://api.bambulab.cn';
const API_GLOBAL = 'https://api.bambulab.com';

/**
 * 浏览器环境下的代理路径前缀
 * Vite dev server 会将 /bambu-api-cn → https://api.bambulab.cn
 *                   /bambu-api-global → https://api.bambulab.com
 * Electron/Capacitor 不需要代理，直接请求原始 URL
 */
const PROXY_CN = '/bambu-api-cn';
const PROXY_GLOBAL = '/bambu-api-global';
const PAGE_SIZE = 20;

/** 模拟 BambuStudio 客户端请求头 */
const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-BBL-Client-Type': 'slicer',
  'X-BBL-Language': 'zh-CN',
};

// ---------------------------------------------------------------------------
// 平台检测
// ---------------------------------------------------------------------------

/** 是否运行在 Electron 中 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electronAPI;
}

/** 是否运行在 Capacitor 原生平台 */
function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

// ---------------------------------------------------------------------------
// HTTP 请求层（多平台适配）
// ---------------------------------------------------------------------------

interface HttpResponse {
  status: number;
  data: Record<string, unknown>;
}

/** Electron: 通过 IPC 让主进程发起 HTTPS 请求 */
async function electronRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>,
): Promise<HttpResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI;
  return api.fetch({ url, method, headers, body });
}

/** Capacitor: 使用原生 HTTP 插件 */
async function capacitorRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>,
): Promise<HttpResponse> {
  const { CapacitorHttp } = await import('@capacitor/core');
  const result = await CapacitorHttp.request({
    url,
    method,
    headers,
    data: body,
  });
  return { status: result.status, data: result.data as Record<string, unknown> };
}

/** Web 浏览器: 标准 fetch */
async function browserRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>,
): Promise<HttpResponse> {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data: data as Record<string, unknown> };
}

/** 统一请求入口：根据平台自动选择请求方式 */
async function request(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {},
): Promise<HttpResponse> {
  const { method = 'GET', headers = {}, body } = options;
  const mergedHeaders = { ...HEADERS, ...headers };

  if (isElectron()) {
    return electronRequest(url, method, mergedHeaders, body);
  }
  if (isCapacitor()) {
    return capacitorRequest(url, method, mergedHeaders, body);
  }
  return browserRequest(url, method, mergedHeaders, body);
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 判断是否为手机号（不含 @） */
function isPhone(account: string): boolean {
  return !account.includes('@');
}

/** 获取 API 基础 URL（手机号→中国区，邮箱→全球区） */
function getBaseUrl(account: string): string {
  return isPhone(account) ? API_CN : API_GLOBAL;
}

/**
 * 获取实际请求 URL
 * 浏览器环境：使用 Vite 代理路径（/bambu-api-cn/...）避免 CORS
 * Electron/Capacitor：直接请求原始 URL（无 CORS 限制）
 */
function getRequestUrl(baseUrl: string, path: string): string {
  if (!isElectron() && !isCapacitor()) {
    // 浏览器环境：替换为代理路径
    const proxyBase = baseUrl === API_CN ? PROXY_CN : PROXY_GLOBAL;
    return `${proxyBase}${path}`;
  }
  return `${baseUrl}${path}`;
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

// ---------------------------------------------------------------------------
// 认证 API
// ---------------------------------------------------------------------------

/** 发送验证码（短信或邮箱） */
export async function sendCode(account: string): Promise<{ success: boolean; error?: string }> {
  try {
    const base = getBaseUrl(account);
    const phone = isPhone(account);
    const { status, data } = await request(
      getRequestUrl(base, phone
        ? '/v1/user-service/user/sendsmscode'
        : '/v1/user-service/user/sendemail/code'),
      {
        method: 'POST',
        body: phone
          ? { phone: account, type: 'codeLogin' }
          : { email: account, type: 'codeLogin' },
      },
    );
    if (status === 429) return { success: false, error: '请求过于频繁，请稍后重试' };
    if (status === 418 || data?.captchaId) return { success: false, error: '需要人机验证，请稍后重试' };
    if (status >= 400) return { success: false, error: `发送失败 (${status})` };
    const statusCode = data?.statusCode as number | undefined;
    const hasStatusError = statusCode !== undefined && statusCode !== 0 && statusCode !== 200;
    const hasErrorMsg = !!data?.error;
    return hasStatusError || hasErrorMsg
      ? { success: false, error: str(data?.message) || str(data?.error) || '发送验证码失败' }
      : { success: true };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

/** 验证码登录 */
export async function loginWithCode(
  account: string,
  code: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await request(getRequestUrl(getBaseUrl(account), '/v1/user-service/user/login'), {
      method: 'POST',
      body: { account, code },
    });
    if (data?.accessToken) {
      return { success: true, token: str(data.accessToken) };
    }
    return { success: false, error: str(data?.message) || str(data?.error) || '登录失败' };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

/** 密码登录 */
export async function loginWithPassword(
  account: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await request(getRequestUrl(getBaseUrl(account), '/v1/user-service/user/login'), {
      method: 'POST',
      body: { account, password, apiError: '' },
    });
    if (data?.accessToken) {
      return { success: true, token: str(data.accessToken) };
    }
    return { success: false, error: str(data?.message) || str(data?.error) || '登录失败' };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

// ---------------------------------------------------------------------------
// 历史记录 API
// ---------------------------------------------------------------------------

/** 获取单页打印历史 */
async function fetchHistoryPage(
  token: string,
  baseUrl: string,
  offset = 0,
): Promise<{ items: BambuHistoryItem[] | null; total: number }> {
  try {
    const { status, data } = await request(
      getRequestUrl(baseUrl, `/v1/user-service/my/tasks?limit=${PAGE_SIZE}&offset=${offset}`),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (status === 401) return { items: null, total: -1 };
    const hits = (data.hits ?? data.tasks ?? []) as BambuHistoryItem[];
    const total = (data.total ?? data.count ?? 0) as number;
    return { items: hits, total };
  } catch {
    return { items: null, total: 0 };
  }
}

/**
 * 分页获取全部打印历史
 * existingIds: 已存在的记录 ID 集合，获取时跳过这些记录（增量更新）
 * onProgress: 进度回调 (fetched, total)
 */
export async function fetchHistory(
  token: string,
  existingIds?: Set<string>,
  onProgress?: (fetched: number, total: number) => void,
): Promise<BambuHistoryItem[]> {
  if (!token) return [];

  let allItems: BambuHistoryItem[] = [];

  // 按优先级尝试两个区域
  for (const baseUrl of [API_CN, API_GLOBAL]) {
    const { items, total } = await fetchHistoryPage(token, baseUrl, 0);
    if (items === null) {
      if (total === -1) return []; // Token 失效
      continue;
    }

    allItems = allItems.concat(items);
    onProgress?.(allItems.length, total);

    // 继续分页获取
    let offset = PAGE_SIZE;
    let retryCount = 0;
    const maxRetries = 3;

    while (offset < total) {
      const page = await fetchHistoryPage(token, baseUrl, offset);
      if (page.items === null) {
        if (page.total === -1) return []; // Token 失效
        retryCount++;
        if (retryCount >= maxRetries) break;
        continue;
      }
      retryCount = 0;
      allItems = allItems.concat(page.items);
      onProgress?.(allItems.length, total);
      offset += PAGE_SIZE;
    }

    // 成功获取到数据就不再尝试另一个域名
    if (allItems.length > 0) break;
  }

  // 过滤已存在的记录（增量更新，统一用 String 转换避免数字/字符串类型不匹配）
  if (existingIds && existingIds.size > 0) {
    allItems = allItems.filter(item => !existingIds.has(String(item.id ?? '')));
  }

  return allItems;
}
