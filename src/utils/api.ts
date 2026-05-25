import { isNative } from './platform';
import * as nativeApi from './native-api';

/** 统一 API 调用入口 — 根据平台自动选择 Express 后端或直连 Bambu API */
export const api = {
  /** 检查登录状态 */
  async checkAuth(): Promise<{ loggedIn: boolean; token?: string }> {
    if (isNative()) {
      return nativeApi.nativeCheckAuth();
    }
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    return { loggedIn: data.success && data.data?.loggedIn, token: data.data?.token };
  },

  /** 发送验证码 */
  async sendCode(account: string): Promise<{ success: boolean; error?: string }> {
    if (isNative()) {
      return nativeApi.nativeSendCode(account);
    }
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  },

  /** 验证码登录 */
  async loginWithCode(
    account: string,
    code: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    if (isNative()) {
      return nativeApi.nativeLoginWithCode(account, code);
    }
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, code }),
    });
    const data = await res.json();
    const token = data.data?.token || data.token;
    return { success: data.success && !!token, token, error: data.error };
  },

  /** 密码登录 */
  async loginWithPassword(
    account: string,
    password: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    if (isNative()) {
      return nativeApi.nativeLoginWithPassword(account, password);
    }
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password }),
    });
    const data = await res.json();
    const token = data.data?.token || data.token;
    return { success: data.success && !!token, token, error: data.error };
  },

  /** 登出 */
  async logout(): Promise<void> {
    if (isNative()) {
      nativeApi.clearNativeData();
      return;
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* 忽略 */ }
  },

  /** 获取历史记录（分页） */
  async getHistory(
    page: number,
    pageSize: number,
    filters?: Record<string, string>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (isNative()) {
      // Android: 从缓存中分页，先尝试刷新
      let records = nativeApi.nativeGetCachedHistory();
      const fresh = await nativeApi.nativeFetchHistory();
      if (fresh.success && fresh.data) records = fresh.data;

      const total = records.length;
      const start = (page - 1) * pageSize;
      const items = records.slice(start, start + pageSize);
      return {
        success: true,
        data: { data: items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      };
    }
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...filters,
    });
    const res = await fetch(`/api/history?${params}`);
    return res.json();
  },

  /** 获取统计数据 */
  async getStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    if (isNative()) {
      // Android: 从缓存计算统计（暂返回空统计骨架，后续可移植后端计算逻辑）
      const records = nativeApi.nativeGetCachedHistory();
      const emptyPeriod = {
        total_prints: records.length, successful_prints: 0, failed_prints: 0, cancelled_prints: 0,
        success_rate: 0, total_weight_g: 0, total_duration_hours: 0,
        devices: {}, filaments: {}, monthly: {}, duration_distribution: {},
        failure_stage_distribution: {},
        extremes: {
          longest: { name: '', hours: 0 }, shortest: { name: '', hours: 0 },
          heaviest: { name: '', weight_g: 0 }, lightest: { name: '', weight_g: 0 },
        },
        nozzle_size_distribution: {}, over_500g_count: 0, over_500g_rate: 0,
        slice_mode_distribution: {}, multi_color_count: 0, multi_color_rate: 0,
      };
      return {
        success: true,
        data: {
          stats_lifetime: emptyPeriod,
          stats_7d: { ...emptyPeriod, total_prints: 0 },
          stats_30d: { ...emptyPeriod, total_prints: 0 },
          activity_heatmap: {},
          filament_success_stats: {},
          color_usage_stats: {},
        },
      };
    }
    const res = await fetch('/api/history/stats');
    return res.json();
  },

  /** 获取设置 */
  async getSettings(): Promise<{ success: boolean; data?: any; error?: string }> {
    if (isNative()) {
      const raw = localStorage.getItem('bambu_native_settings');
      const settings = raw
        ? JSON.parse(raw)
        : { loggingEnabled: false, logLevel: 'INFO', cacheCount: nativeApi.nativeGetCachedHistory().length };
      return { success: true, data: settings };
    }
    const res = await fetch('/api/settings');
    return res.json();
  },

  /** 更新设置 */
  async updateSettings(patch: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    if (isNative()) {
      const raw = localStorage.getItem('bambu_native_settings');
      const current = raw ? JSON.parse(raw) : {};
      localStorage.setItem('bambu_native_settings', JSON.stringify({ ...current, ...patch }));
      return { success: true };
    }
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.json();
  },

  /** 清除缓存 */
  async clearCache(): Promise<{ success: boolean }> {
    if (isNative()) {
      localStorage.removeItem('bambu_native_history');
      return { success: true };
    }
    await fetch('/api/settings/cache', { method: 'DELETE' });
    return { success: true };
  },

  /** 清除全部数据 */
  async clearAll(): Promise<{ success: boolean }> {
    if (isNative()) {
      nativeApi.clearNativeData();
      return { success: true };
    }
    await fetch('/api/settings/all', { method: 'DELETE' });
    return { success: true };
  },
};
