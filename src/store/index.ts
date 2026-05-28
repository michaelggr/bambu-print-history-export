import { create } from 'zustand';
import type { BambuHistoryItem } from '@/types/bambu';

/** Bambu 打印记录类型（使用共享类型） */
export type BambuRecord = BambuHistoryItem;

/** 统计响应类型 */
export interface StatsResponse {
  total_prints: number;
  success_rate: number;
  total_duration: number;
  total_weight: number;
  by_status: Record<number, number>;
  by_device: Record<string, { name: string; count: number }>;
  by_filament: Record<string, { color: string; weight: number; count: number }>;
  daily_stats: Array<{ date: string; count: number; duration: number; weight: number }>;
}

interface AppState {
  // 认证
  isLoggedIn: boolean;
  token: string | null;

  // 历史数据
  history: BambuRecord[];
  totalCount: number;
  isLoading: boolean;

  // 统计
  stats: StatsResponse | null;

  // 操作
  setAuth: (token: string) => void;
  clearAuth: () => void;
  setHistory: (records: BambuRecord[], total: number) => void;
  setStats: (stats: StatsResponse) => void;
  setLoading: (loading: boolean) => void;
}

/** 从 localStorage 恢复 token（兼容 JSON 对象和纯字符串格式） */
function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('bambu_token');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed || null;
    if (parsed?.token && typeof parsed.token === 'string') return parsed.token;
    return null;
  } catch {
    return localStorage.getItem('bambu_token') || null;
  }
}

const useAppStore = create<AppState>((set) => ({
  isLoggedIn: !!getStoredToken(),
  token: getStoredToken(),

  history: [],
  totalCount: 0,
  isLoading: false,
  stats: null,

  setAuth: (token: string) => {
    // 使用 JSON 格式存储，与 bambu-cache.ts 的 saveToken 保持一致
    localStorage.setItem('bambu_token', JSON.stringify({ token, saved_at: Date.now() }));
    set({ isLoggedIn: true, token });
  },

  clearAuth: () => {
    localStorage.removeItem('bambu_token');
    set({ isLoggedIn: false, token: null, history: [], stats: null });
  },

  setHistory: (records, total) => set({ history: records, totalCount: total }),

  setStats: (stats) => set({ stats }),

  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useAppStore;
