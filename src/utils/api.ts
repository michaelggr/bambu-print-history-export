/**
 * 统一 API 调用入口（纯前端）
 * 所有平台（Web/Electron/Capacitor）统一通过此模块访问数据，
 * 不再依赖 Express 后端。
 */

import * as bambuApi from './bambu-api';
import * as bambuCache from './bambu-cache';
import * as bambuFilter from './bambu-filter';
import * as bambuStats from './native-stats';

// ---------------------------------------------------------------------------
// 认证
// ---------------------------------------------------------------------------

export const api = {
  /** 检查登录状态 */
  async checkAuth(): Promise<{ loggedIn: boolean; token?: string }> {
    const token = bambuCache.loadToken();
    return token ? { loggedIn: true, token } : { loggedIn: false };
  },

  /** 发送验证码 */
  async sendCode(account: string): Promise<{ success: boolean; error?: string }> {
    return bambuApi.sendCode(account);
  },

  /** 验证码登录 */
  async loginWithCode(
    account: string,
    code: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    const result = await bambuApi.loginWithCode(account, code);
    if (result.success && result.token) {
      bambuCache.saveToken(result.token, account);
    }
    return result;
  },

  /** 密码登录 */
  async loginWithPassword(
    account: string,
    password: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    const result = await bambuApi.loginWithPassword(account, password);
    if (result.success && result.token) {
      bambuCache.saveToken(result.token, account);
    }
    return result;
  },

  /** 登出 */
  async logout(): Promise<void> {
    bambuCache.clearAll();
  },

  // ---------------------------------------------------------------------------
  // 历史记录
  // ---------------------------------------------------------------------------

  /** 获取历史记录（分页 + 筛选） */
  async getHistory(
    page: number,
    pageSize: number,
    filters?: Record<string, string>,
  ): Promise<{ success: boolean; data?: bambuFilter.PaginatedResult<bambuStats.NativeBambuItem>; devices?: string[]; error?: string }> {
    const history = bambuCache.loadHistoryCache();

    // 应用筛选
    const filtered = bambuFilter.applyFilters(history, filters ?? {});

    // 按时间倒序排列
    filtered.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));

    // 分页
    const result = bambuFilter.paginate(filtered, page, pageSize);

    // 提取设备列表
    const devices = bambuFilter.extractDeviceList(history);

    return { success: true, data: result, devices };
  },

  /** 获取统计数据 */
  async getStats(): Promise<{ success: boolean; data?: bambuStats.NativeStatsResult; error?: string }> {
    const history = bambuCache.loadHistoryCache();
    const stats = bambuStats.calculateNativeStats(history);
    return { success: true, data: stats };
  },

  /** 增量更新：获取新记录并合并到缓存 */
  async refreshHistory(): Promise<{ success: boolean; data?: { added: number; total?: number }; error?: string }> {
    const token = bambuCache.loadToken();
    if (!token) return { success: false, error: '未登录，请先登录' };

    const existingIds = bambuCache.loadExistingIds();
    const newItems = await bambuApi.fetchHistory(token, existingIds);

    if (newItems.length === 0) {
      return { success: true, data: { added: 0 } };
    }

    // 合并到缓存
    const existing = bambuCache.loadHistoryCache();
    const merged = [...newItems, ...existing];
    bambuCache.saveHistoryCache(merged);

    return { success: true, data: { added: newItems.length, total: merged.length } };
  },

  /** 全量下载：重新获取全部历史 */
  async fullDownload(): Promise<{ success: boolean; data?: { total: number }; error?: string }> {
    const token = bambuCache.loadToken();
    if (!token) return { success: false, error: '未登录，请先登录' };

    const allItems = await bambuApi.fetchHistory(token);
    bambuCache.saveHistoryCache(allItems);

    return { success: true, data: { total: allItems.length } };
  },

  // ---------------------------------------------------------------------------
  // 导出
  // ---------------------------------------------------------------------------

  /** 导出数据（JSON/CSV/HA 格式） */
  async exportData(
    format: 'json' | 'csv' | 'ha',
    filters?: bambuFilter.FilterParams,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    let history = bambuCache.loadHistoryCache();

    // 应用筛选
    if (filters) {
      history = bambuFilter.applyFilters(history, filters);
    }

    if (format === 'json') {
      return { success: true, data: history };
    }

    if (format === 'csv') {
      const { generateCSV } = await import('./bambu-transform');
      const csv = generateCSV(history);
      return { success: true, data: csv };
    }

    if (format === 'ha') {
      const { convertToHAFormat } = await import('./bambu-transform');
      const haData = convertToHAFormat(history);
      return { success: true, data: haData };
    }

    return { success: false, error: '不支持的导出格式' };
  },

  // ---------------------------------------------------------------------------
  // 设置
  // ---------------------------------------------------------------------------

  /** 获取设置 */
  async getSettings(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const settings = bambuCache.loadSettings();
    const cacheCount = bambuCache.loadHistoryCache().length;
    return { success: true, data: { ...settings, cacheCount } };
  },

  /** 更新设置（白名单过滤） */
  async updateSettings(patch: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    const ALLOWED_KEYS = new Set(['loggingEnabled', 'logLevel']);
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_KEYS.has(key)) filtered[key] = value;
    }
    const current = bambuCache.loadSettings();
    bambuCache.saveSettings({ ...current, ...filtered });
    return { success: true };
  },

  /** 清除缓存 */
  async clearCache(): Promise<{ success: boolean }> {
    bambuCache.clearCache();
    return { success: true };
  },

  /** 清除全部数据 */
  async clearAll(): Promise<{ success: boolean }> {
    bambuCache.clearAll();
    return { success: true };
  },
};
