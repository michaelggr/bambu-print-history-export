﻿﻿﻿﻿﻿﻿import Taro from '@tarojs/taro';
import type { BambuHistoryItem } from '@/types/bambu';

const API_CN = 'https://api.bambulab.cn';
const API_GLOBAL = 'https://api.bambulab.com';
const PAGE_SIZE = 20;

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-BBL-Client-Type': 'slicer',
  'X-BBL-Language': 'zh-CN',
};

function isPhone(account: string): boolean {
  return !account.includes('@');
}

function getBaseUrl(account: string): string {
  return isPhone(account) ? API_CN : API_GLOBAL;
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

interface TaroResponse {
  statusCode: number;
  data: Record<string, unknown>;
}

async function request(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeout?: number;
  } = {},
): Promise<TaroResponse> {
  const { method = 'GET', headers = {}, body, timeout = 15000 } = options;
  const mergedHeaders = { ...HEADERS, ...headers };

  // 设置默认超时时间为 15 秒，避免网络波动导致失败
  const res = await Taro.request({
    url,
    method: method as keyof Taro.request.Method,
    data: body,
    header: mergedHeaders,
    timeout,
  });

  return { statusCode: res.statusCode, data: res.data as Record<string, unknown> };
}

export async function sendCode(account: string): Promise<{ success: boolean; error?: string }> {
  try {
    const base = getBaseUrl(account);
    const phone = isPhone(account);
    const { statusCode, data } = await request(
      `${base}${phone ? '/v1/user-service/user/sendsmscode' : '/v1/user-service/user/sendemail/code'}`,
      {
        method: 'POST',
        body: phone
          ? { phone: account, type: 'codeLogin' }
          : { email: account, type: 'codeLogin' },
      },
    );
    if (statusCode === 429) return { success: false, error: '请求过于频繁，请稍后重试' };
    if (statusCode === 418 || data?.captchaId) return { success: false, error: '需要人机验证，请稍后重试' };
    if (statusCode >= 400) return { success: false, error: `发送失败 (${statusCode})` };
    const statusVal = data?.statusCode as number | undefined;
    const hasStatusError = statusVal !== undefined && statusVal !== 0 && statusVal !== 200;
    const hasErrorMsg = !!data?.error;
    return hasStatusError || hasErrorMsg
      ? { success: false, error: str(data?.message) || str(data?.error) || '发送验证码失败' }
      : { success: true };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

export async function loginWithCode(
  account: string,
  code: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await request(`${getBaseUrl(account)}/v1/user-service/user/login`, {
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

export async function loginWithPassword(
  account: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await request(`${getBaseUrl(account)}/v1/user-service/user/login`, {
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

async function fetchHistoryPage(
  token: string,
  baseUrl: string,
  offset = 0,
): Promise<{ items: BambuHistoryItem[] | null; total: number }> {
  try {
    const { statusCode, data } = await request(
      `${baseUrl}/v1/user-service/my/tasks?limit=${PAGE_SIZE}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (statusCode === 401) return { items: null, total: -1 };
    const hits = (data.hits ?? data.tasks ?? []) as BambuHistoryItem[];
    const total = (data.total ?? data.count ?? 0) as number;
    return { items: hits, total };
  } catch {
    return { items: null, total: 0 };
  }
}

export async function fetchHistory(
  token: string,
  existingIds?: Set<string>,
  onProgress?: (fetched: number, total: number) => void,
): Promise<BambuHistoryItem[]> {
  if (!token) return [];

  let allItems: BambuHistoryItem[] = [];

  for (const baseUrl of [API_CN, API_GLOBAL]) {
    const { items, total } = await fetchHistoryPage(token, baseUrl, 0);
    if (items === null) {
      if (total === -1) return [];
      continue;
    }

    allItems = allItems.concat(items);
    onProgress?.(allItems.length, total);

    let offset = PAGE_SIZE;
    let retryCount = 0;
    const maxRetries = 3;

    while (offset < total) {
      const page = await fetchHistoryPage(token, baseUrl, offset);
      if (page.items === null) {
        if (page.total === -1) return [];
        retryCount++;
        if (retryCount >= maxRetries) break;
        continue;
      }
      retryCount = 0;
      allItems = allItems.concat(page.items);
      onProgress?.(allItems.length, total);
      offset += PAGE_SIZE;
    }

    if (allItems.length > 0) break;
  }

  if (existingIds && existingIds.size > 0) {
    allItems = allItems.filter(item => !existingIds.has(String(item.id ?? '')));
  }

  return allItems;
}
