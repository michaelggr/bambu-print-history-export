﻿﻿﻿﻿﻿﻿import Taro from '@tarojs/taro';
import type { BambuHistoryItem } from '@/types/bambu';

const TOKEN_KEY = 'bambu_token';
const HISTORY_KEY = 'bambu_history';
const SETTINGS_KEY = 'bambu_settings';

function readJson<T>(key: string): T | null {
  try {
    const raw = Taro.getStorageSync(key);
    if (!raw) return null;
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
  } catch {
    return null;
  }
}

function writeJson(key: string, data: unknown): void {
  Taro.setStorageSync(key, JSON.stringify(data));
}

export function saveToken(token: string, account = ''): void {
  writeJson(TOKEN_KEY, { token, saved_at: Date.now(), account });
}

export function loadToken(): string | null {
  const raw = Taro.getStorageSync(TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed === 'string') return parsed || null;
    if (parsed?.token && typeof parsed.token === 'string') return parsed.token;
    return null;
  } catch {
    return typeof raw === 'string' ? raw || null : null;
  }
}

export function clearToken(): void {
  Taro.removeStorageSync(TOKEN_KEY);
}

interface HistoryCacheData {
  ids: string[];
  history: BambuHistoryItem[];
  saved_at: number;
}

export function saveHistoryCache(history: BambuHistoryItem[]): void {
  const ids = history
    .map(item => String(item.id ?? ''))
    .filter(id => id !== '');
  writeJson(HISTORY_KEY, { ids, history, saved_at: Date.now() });
}

export function loadHistoryCache(): BambuHistoryItem[] {
  const data = readJson<HistoryCacheData>(HISTORY_KEY);
  if (data?.history) return data.history;
  const arr = readJson<BambuHistoryItem[]>(HISTORY_KEY);
  if (Array.isArray(arr)) return arr;
  return [];
}

export function loadExistingIds(): Set<string> {
  const data = readJson<HistoryCacheData>(HISTORY_KEY);
  if (data?.ids) return new Set(data.ids);
  const arr = readJson<BambuHistoryItem[]>(HISTORY_KEY);
  if (Array.isArray(arr)) {
    const ids = arr
      .map(item => String(item.id ?? ''))
      .filter(id => id !== '');
    return new Set(ids);
  }
  return new Set();
}

export function saveSettings(settings: Record<string, unknown>): void {
  writeJson(SETTINGS_KEY, settings);
}

export function loadSettings(): Record<string, unknown> {
  return readJson<Record<string, unknown>>(SETTINGS_KEY) ?? {};
}

export function clearCache(): void {
  Taro.removeStorageSync(HISTORY_KEY);
}

export function clearAll(): void {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(HISTORY_KEY);
  Taro.removeStorageSync(SETTINGS_KEY);
}
