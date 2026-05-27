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

/** 从 localStorage 恢复 token */
function getStoredToken(): string | null {
  try {
    return localStorage.getItem('bambu_token');
  } catch {
    return null;
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
    // 安全说明：token 以明文存储在 localStorage 中，存在 XSS 攻击窃取风险。
    // 当前为浏览器端应用，无更安全的替代方案（如 HttpOnly Cookie 需后端配合）。
    // 若后续支持后端 Session，应迁移至 HttpOnly Cookie 存储。
    localStorage.setItem('bambu_token', token);
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
