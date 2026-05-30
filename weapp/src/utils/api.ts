﻿﻿﻿﻿﻿﻿import * as bambuApi from './bambu-api';
import * as bambuCache from './bambu-cache';
import * as bambuFilter from './bambu-filter';
import * as bambuStats from './native-stats';
import * as bambuImport from './bambu-import';
import Taro from '@tarojs/taro';

export const api = {
  async checkAuth(): Promise<{ loggedIn: boolean; token?: string }> {
    const token = bambuCache.loadToken();
    return token ? { loggedIn: true, token } : { loggedIn: false };
  },

  async sendCode(account: string): Promise<{ success: boolean; error?: string }> {
    return bambuApi.sendCode(account);
  },

  async loginWithCode(
    account: string, code: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    const result = await bambuApi.loginWithCode(account, code);
    if (result.success && result.token) bambuCache.saveToken(result.token, account);
    return result;
  },

  async logout(): Promise<void> {
    bambuCache.clearAll();
  },

  async getHistory(
    page: number, pageSize: number, filters?: Record<string, string>,
  ): Promise<{ success: boolean; data?: bambuFilter.PaginatedResult<bambuStats.BambuHistoryItem>; devices?: string[]; error?: string }> {
    const history = bambuCache.loadHistoryCache();
    const filtered = bambuFilter.applyFilters(history, filters ?? {});
    filtered.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));
    const result = bambuFilter.paginate(filtered, page, pageSize);
    const devices = bambuFilter.extractDeviceList(history);
    return { success: true, data: result, devices };
  },

  async getStats(): Promise<{ success: boolean; data?: bambuStats.StatsResult; error?: string }> {
    const history = bambuCache.loadHistoryCache();
    const stats = bambuStats.calculateNativeStats(history);
    return { success: true, data: stats };
  },

  async refreshHistory(): Promise<{ success: boolean; data?: { added: number; total?: number }; error?: string }> {
    const token = bambuCache.loadToken();
    if (!token) return { success: false, error: '未登录，请先登录' };
    const existingIds = bambuCache.loadExistingIds();
    const newItems = await bambuApi.fetchHistory(token, existingIds);
    if (newItems.length === 0) return { success: true, data: { added: 0 } };
    const existing = bambuCache.loadHistoryCache();
    const merged = [...newItems, ...existing];
    bambuCache.saveHistoryCache(merged);
    return { success: true, data: { added: newItems.length, total: merged.length } };
  },

  async fullDownload(): Promise<{ success: boolean; data?: { total: number }; error?: string }> {
    const token = bambuCache.loadToken();
    if (!token) return { success: false, error: '未登录，请先登录' };
    const allItems = await bambuApi.fetchHistory(token);
    bambuCache.saveHistoryCache(allItems);
    return { success: true, data: { total: allItems.length } };
  },

  async exportData(
    format: 'json' | 'csv' | 'ha', filters?: bambuFilter.FilterParams,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    let history = bambuCache.loadHistoryCache();
    if (filters) history = bambuFilter.applyFilters(history, filters);
    if (format === 'json') return { success: true, data: history };
    if (format === 'csv') {
      const { generateCSV } = await import('./bambu-transform');
      return { success: true, data: generateCSV(history) };
    }
    if (format === 'ha') {
      const { convertToHAFormat } = await import('./bambu-transform');
      return { success: true, data: convertToHAFormat(history) };
    }
    return { success: false, error: '不支持的导出格式' };
  },

  async importFile(
    content: string, mode: 'merge' | 'overwrite',
  ): Promise<{ success: boolean; data?: bambuImport.ImportMergeResult | bambuImport.ImportOverwriteResult; error?: string }> {
    const result = bambuImport.parseImportFile(content);
    if (!result.success) return { success: false, error: result.error };

    if (mode === 'merge') {
      const mergeResult = bambuImport.importMerge(result.data);
      return { success: true, data: mergeResult };
    }
    const overwriteResult = bambuImport.importOverwrite(result.data);
    return { success: true, data: overwriteResult };
  },

  async shareExport(format: 'json' | 'csv' | 'ha'): Promise<{ success: boolean; error?: string }> {
    const res = await this.exportData(format);
    if (!res.success || !res.data) return { success: false, error: res.error };

    const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
    const ext = format === 'csv' ? 'csv' : 'json';
    const fileName = `bambu-export-${Date.now()}.${ext}`;
    const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;

    const fs = Taro.getFileSystemManager();
    fs.writeFileSync(filePath, content, 'utf8');

    return new Promise(resolve => {
      Taro.shareFileMessage({
        filePath,
        fileName,
        success: () => resolve({ success: true }),
        fail: () => {
          Taro.setClipboardData({ data: filePath });
          resolve({ success: true });
        },
      });
    });
  },

  async getSettings(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const settings = bambuCache.loadSettings();
    const cacheCount = bambuCache.loadHistoryCache().length;
    return { success: true, data: { ...settings, cacheCount } };
  },

  async clearCache(): Promise<{ success: boolean }> {
    bambuCache.clearCache();
    return { success: true };
  },

  async clearAll(): Promise<{ success: boolean }> {
    bambuCache.clearAll();
    return { success: true };
  },
};
