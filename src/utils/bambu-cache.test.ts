import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveToken,
  loadToken,
  clearToken,
  saveHistoryCache,
  loadHistoryCache,
  loadExistingIds,
  saveSettings,
  loadSettings,
  clearCache,
  clearAll,
} from './bambu-cache';
import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 测试用 fixture
// ---------------------------------------------------------------------------

function createItem(id: string, overrides: Partial<BambuHistoryItem> = {}): BambuHistoryItem {
  return {
    id,
    designTitle: `模型-${id}`,
    status: 2,
    deviceName: 'X1C',
    startTime: '2025-06-15T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 每个测试前清空 localStorage
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Token 缓存
// ---------------------------------------------------------------------------

describe('Token 缓存', () => {
  it('保存和读取 token', () => {
    saveToken('test-token-123', 'user@example.com');
    expect(loadToken()).toBe('test-token-123');
  });

  it('无 token 时返回 null', () => {
    expect(loadToken()).toBeNull();
  });

  it('清除 token', () => {
    saveToken('test-token');
    clearToken();
    expect(loadToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 历史数据缓存
// ---------------------------------------------------------------------------

describe('历史数据缓存', () => {
  it('保存和加载历史数据', () => {
    const items = [createItem('001'), createItem('002')];
    saveHistoryCache(items);
    const loaded = loadHistoryCache();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('001');
  });

  it('加载空缓存返回空数组', () => {
    expect(loadHistoryCache()).toEqual([]);
  });

  it('保存后可提取 existingIds', () => {
    const items = [createItem('001'), createItem('002'), createItem('003')];
    saveHistoryCache(items);
    const ids = loadExistingIds();
    expect(ids.size).toBe(3);
    expect(ids.has('001')).toBe(true);
    expect(ids.has('002')).toBe(true);
  });

  it('无 id 的记录不纳入 ids', () => {
    const items = [createItem('001'), { status: 2 } as BambuHistoryItem];
    saveHistoryCache(items);
    const ids = loadExistingIds();
    expect(ids.size).toBe(1);
    expect(ids.has('001')).toBe(true);
  });

  it('兼容旧格式（直接是数组）', () => {
    // 模拟旧格式：localStorage 中直接存数组
    const items = [createItem('old-001')];
    localStorage.setItem('bambu_history', JSON.stringify(items));
    const loaded = loadHistoryCache();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('old-001');
  });
});

// ---------------------------------------------------------------------------
// 设置缓存
// ---------------------------------------------------------------------------

describe('设置缓存', () => {
  it('保存和读取设置', () => {
    saveSettings({ loggingEnabled: true, logLevel: 'DEBUG' });
    const settings = loadSettings();
    expect(settings.loggingEnabled).toBe(true);
    expect(settings.logLevel).toBe('DEBUG');
  });

  it('无设置时返回空对象', () => {
    expect(loadSettings()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 清除操作
// ---------------------------------------------------------------------------

describe('清除操作', () => {
  it('clearCache 只清除历史', () => {
    saveToken('token-123');
    saveHistoryCache([createItem('001')]);
    saveSettings({ loggingEnabled: true });

    clearCache();

    expect(loadToken()).toBe('token-123');        // token 保留
    expect(loadHistoryCache()).toEqual([]);        // 历史已清除
    expect(loadSettings().loggingEnabled).toBe(true); // 设置保留
  });

  it('clearAll 清除全部', () => {
    saveToken('token-123');
    saveHistoryCache([createItem('001')]);
    saveSettings({ loggingEnabled: true });

    clearAll();

    expect(loadToken()).toBeNull();
    expect(loadHistoryCache()).toEqual([]);
    expect(loadSettings()).toEqual({});
  });
});
