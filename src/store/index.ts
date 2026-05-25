import { create } from 'zustand';

/** Bambu 打印记录类型 */
export interface BambuRecord {
  id: string;
  device_id: string;
  device_name: string;
  model_id: string;
  task_id: string;
  status: number;
  file_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  weight: number;
  filament_type: string;
  filament_color: string;
  cover_image: string;
  thumbnail: string;
  plate_index: number;
}

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
