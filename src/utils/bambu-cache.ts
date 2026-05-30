﻿﻿﻿﻿﻿﻿﻿﻿/**
 * 缓存管理层（纯前端）
 * 基于 localStorage 管理 token、历史数据、设置等，
 * 对齐后端 cache.ts 的完整功能，含 ids 索引和增量更新支持。
 */

import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 存储键名
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'bambu_token';
const HISTORY_KEY = 'bambu_history';
const SETTINGS_KEY = 'bambu_settings';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Token 缓存
// ---------------------------------------------------------------------------

// TokenData 仅用于 saveToken 的写入格式参考，loadToken 已兼容多种格式

/** 保存 token */
export function saveToken(token: string, account = ''): void {
  writeJson(TOKEN_KEY, { token, saved_at: Date.now(), account });
}

/** 读取 token（兼容 JSON 对象格式和纯字符串格式） */
export function loadToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed || null;
    if (parsed?.token && typeof parsed.token === 'string') return parsed.token;
    return null;
  } catch {
    // 非 JSON 字符串，直接当作 token
    return raw || null;
  }
}

/** 清除 token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// 历史数据缓存
// ---------------------------------------------------------------------------

interface HistoryCacheData {
  ids: string[];
  history: BambuHistoryItem[];
  saved_at: number;
}

/** 保存历史数据（含 ids 索引和时间戳） */
export function saveHistoryCache(history: BambuHistoryItem[]): void {
  const ids = history
    .map(item => String(item.id ?? ''))
    .filter(id => id !== '');

  writeJson(HISTORY_KEY, { ids, history, saved_at: Date.now() });
}

/** 加载历史数据 */
export function loadHistoryCache(): BambuHistoryItem[] {
  const data = readJson<HistoryCacheData>(HISTORY_KEY);
  if (data?.history) return data.history;
  // 兼容旧格式（直接是数组）
  const arr = readJson<BambuHistoryItem[]>(HISTORY_KEY);
  if (Array.isArray(arr)) return arr;
  return [];
}

/** 加载已存在的记录 ID 集合（用于增量更新） */
export function loadExistingIds(): Set<string> {
  const data = readJson<HistoryCacheData>(HISTORY_KEY);
  if (data?.ids) return new Set(data.ids);
  // 兼容旧格式：从历史记录中提取 ids
  const arr = readJson<BambuHistoryItem[]>(HISTORY_KEY);
  if (Array.isArray(arr)) {
    const ids = arr
      .map(item => String(item.id ?? ''))
      .filter(id => id !== '');
    return new Set(ids);
  }
  return new Set();
}

// ---------------------------------------------------------------------------
// 设置缓存
// ---------------------------------------------------------------------------

/** 保存设置 */
export function saveSettings(settings: Record<string, unknown>): void {
  writeJson(SETTINGS_KEY, settings);
}

/** 读取设置 */
export function loadSettings(): Record<string, unknown> {
  return readJson<Record<string, unknown>>(SETTINGS_KEY) ?? {};
}

// ---------------------------------------------------------------------------
// 清除操作
// ---------------------------------------------------------------------------

/** 清除历史缓存 */
export function clearCache(): void {
  localStorage.removeItem(HISTORY_KEY);
}

/** 清除全部数据 */
export function clearAll(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}
