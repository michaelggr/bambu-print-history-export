﻿﻿﻿﻿﻿﻿import { create } from 'zustand';
import * as bambuCache from '@/utils/bambu-cache';
import type { BambuHistoryItem } from '@/types/bambu';

interface AppState {
  loggedIn: boolean;
  token: string | null;
  history: BambuHistoryItem[];
  loading: boolean;
  downloading: boolean;
  downloadProgress: { fetched: number; total: number };

  checkAuth: () => void;
  setLogin: (token: string) => void;
  setLogout: () => void;
  setHistory: (items: BambuHistoryItem[]) => void;
  setLoading: (v: boolean) => void;
  setDownloading: (v: boolean) => void;
  setDownloadProgress: (fetched: number, total: number) => void;
  loadCachedHistory: () => void;
}

// 启动时立即从缓存恢复登录状态
const cachedToken = bambuCache.loadToken();
const cachedHistory = bambuCache.loadHistoryCache();

export const useAppStore = create<AppState>((set) => ({
  loggedIn: !!cachedToken,
  token: cachedToken,
  history: cachedHistory,
  loading: false,
  downloading: false,
  downloadProgress: { fetched: 0, total: 0 },

  checkAuth: () => {
    const token = bambuCache.loadToken();
    set({ loggedIn: !!token, token });
  },

  setLogin: (token: string) => {
    set({ loggedIn: true, token });
  },

  setLogout: () => {
    bambuCache.clearAll();
    set({ loggedIn: false, token: null, history: [] });
  },

  setHistory: (items) => set({ history: items }),

  setLoading: (v) => set({ loading: v }),

  setDownloading: (v) => set({ downloading: v }),

  setDownloadProgress: (fetched, total) => set({ downloadProgress: { fetched, total } }),

  loadCachedHistory: () => {
    const cached = bambuCache.loadHistoryCache();
    if (cached.length > 0) set({ history: cached });
  },
}));
