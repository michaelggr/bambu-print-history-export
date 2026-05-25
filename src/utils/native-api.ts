import { isNative } from './platform';

const BAMBU_API_BASE = 'https://api.bambulab.com/v1';

// 本地存储 key
const TOKEN_KEY = 'bambu_native_token';
const HISTORY_KEY = 'bambu_native_history';
const USER_KEY = 'bambu_native_user';

/** 获取本地存储的 token */
export function getNativeToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 保存 token */
function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** 清除 token 和缓存 */
export function clearNativeData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * 原生 HTTP 请求 — 使用 Capacitor HTTP 插件绕过 CORS
 * Capacitor WebView 中 fetch 会被 Bambu API 的 CORS 策略拦截
 */
async function nativeRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {},
): Promise<{ status: number; data: any }> {
  const { method = 'GET', headers = {}, body } = options;
  // 动态导入 CapacitorHttp，仅在原生平台可用
  const { CapacitorHttp } = await import('@capacitor/core');
  const result = await CapacitorHttp.request({
    url,
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    data: body,
  });
  return { status: result.status, data: result.data };
}

/** 发送验证码 — POST /v1/user-service/login/sms */
export async function nativeSendCode(account: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { status } = await nativeRequest(`${BAMBU_API_BASE}/user-service/login/sms`, {
      method: 'POST',
      body: { account },
    });
    if (status === 429) return { success: false, error: '请求过于频繁，请稍后重试' };
    if (status === 418) return { success: false, error: '需要人机验证，请稍后重试' };
    if (status >= 400) return { success: false, error: `发送失败 (${status})` };
    return { success: true };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

/** 验证码登录 — POST /v1/user-service/login/sms/check */
export async function nativeLoginWithCode(
  account: string,
  code: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await nativeRequest(`${BAMBU_API_BASE}/user-service/login/sms/check`, {
      method: 'POST',
      body: { account, code },
    });
    if (data.accessToken) {
      saveToken(data.accessToken);
      return { success: true, token: data.accessToken };
    }
    return { success: false, error: data.message || '登录失败' };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

/** 密码登录 — POST /v1/user-service/login */
export async function nativeLoginWithPassword(
  account: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { data } = await nativeRequest(`${BAMBU_API_BASE}/user-service/login`, {
      method: 'POST',
      body: { account, password },
    });
    if (data.accessToken) {
      saveToken(data.accessToken);
      return { success: true, token: data.accessToken };
    }
    return { success: false, error: data.message || '登录失败' };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

/** 获取打印历史 — GET /v1/print-service/list（自动分页获取全部） */
export async function nativeFetchHistory(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const token = getNativeToken();
  if (!token) return { success: false, error: '未登录' };

  try {
    let allRecords: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const { status, data } = await nativeRequest(
        `${BAMBU_API_BASE}/print-service/list?offset=${offset}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (status === 401) {
        clearNativeData();
        return { success: false, error: '登录已过期，请重新登录' };
      }
      const records = data?.data?.list || data?.list || [];
      allRecords = allRecords.concat(records);
      hasMore = records.length === limit;
      offset += limit;
    }

    // 缓存到本地
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allRecords));
    return { success: true, data: allRecords };
  } catch {
    return { success: false, error: '网络错误' };
  }
}

/** 获取缓存的打印历史 */
export function nativeGetCachedHistory(): any[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 检查登录状态 */
export function nativeCheckAuth(): { loggedIn: boolean; token?: string } {
  const token = getNativeToken();
  return token ? { loggedIn: true, token } : { loggedIn: false };
}
