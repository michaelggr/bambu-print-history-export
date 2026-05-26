﻿type JsonObject = Record<string, unknown>;

type NativeRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: JsonObject;
};

const API_CN = 'https://api.bambulab.cn';
const API_GLOBAL = 'https://api.bambulab.com';

const TOKEN_KEY = 'bambu_native_token';
const HISTORY_KEY = 'bambu_native_history';
const USER_KEY = 'bambu_native_user';

function isPhone(account: string): boolean {
  return !account.includes('@');
}

function getBaseUrl(account: string): string {
  return isPhone(account) ? API_CN : API_GLOBAL;
}

export function getNativeToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearNativeData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(USER_KEY);
}

async function nativeRequest(
  url: string,
  options: NativeRequestOptions = {},
): Promise<{ status: number; data: JsonObject }> {
  const { method = 'GET', headers = {}, body } = options;
  const { CapacitorHttp } = await import('@capacitor/core');
  const result = await CapacitorHttp.request({
    url,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-BBL-Client-Type': 'slicer',
      'X-BBL-Language': 'zh-CN',
      ...headers,
    },
    data: body,
  });
  return { status: result.status, data: result.data as JsonObject };
}

export async function nativeSendCode(account: string): Promise<{ success: boolean; error?: string }> {
  try {
    const base = getBaseUrl(account);
    const phone = isPhone(account);
    const { status, data } = await nativeRequest(
      phone
        ? `${base}/v1/user-service/user/sendsmscode`
        : `${base}/v1/user-service/user/sendemail/code`,
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
    const statusCode = data?.statusCode;
    const hasStatusError = statusCode !== undefined && statusCode !== 0 && statusCode !== 200;
    const hasErrorMsg = !!data?.error;
    return hasStatusError || hasErrorMsg
      ? { success: false, error: data?.message || data?.error || '发送验证码失败' }
      : { success: true };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

export async function nativeLoginWithCode(
  account: string,
  code: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await nativeRequest(`${getBaseUrl(account)}/v1/user-service/user/login`, {
      method: 'POST',
      body: { account, code },
    });
    if (data?.accessToken) {
      saveToken(data.accessToken);
      return { success: true, token: data.accessToken };
    }
    return { success: false, error: data?.message || data?.error || '登录失败' };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

export async function nativeLoginWithPassword(
  account: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await nativeRequest(`${getBaseUrl(account)}/v1/user-service/user/login`, {
      method: 'POST',
      body: { account, password, apiError: '' },
    });
    if (data?.accessToken) {
      saveToken(data.accessToken);
      return { success: true, token: data.accessToken };
    }
    return { success: false, error: data?.message || data?.error || '登录失败' };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

export async function nativeFetchHistory(): Promise<{ success: boolean; data?: JsonObject[]; error?: string }> {
  const token = getNativeToken();
  if (!token) return { success: false, error: '未登录' };

  try {
    let allRecords: JsonObject[] = [];
    for (const baseUrl of [API_CN, API_GLOBAL]) {
      let offset = 0;
      const limit = 20;
      let total = 0;
      let recordsInRegion: any[] = [];

      do {
        const { status, data } = await nativeRequest(
          `${baseUrl}/v1/user-service/my/tasks?limit=${limit}&offset=${offset}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (status === 401) {
          clearNativeData();
          return { success: false, error: '登录已过期，请重新登录' };
        }
        const records = data?.hits || data?.tasks || [];
        total = data?.total || data?.count || records.length;
        recordsInRegion = recordsInRegion.concat(records);
        offset += limit;
      } while (offset < total);

      if (recordsInRegion.length > 0) {
        allRecords = recordsInRegion;
        break;
      }
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(allRecords));
    return { success: true, data: allRecords };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

export function nativeGetCachedHistory(): any[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function nativeCheckAuth(): { loggedIn: boolean; token?: string } {
  const token = getNativeToken();
  return token ? { loggedIn: true, token } : { loggedIn: false };
}
