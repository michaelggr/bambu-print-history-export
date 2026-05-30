﻿﻿﻿﻿﻿﻿import type { BambuHistoryItem } from '@/types/bambu';

export interface FilterParams {
  status?: string;
  device?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function applyFilters(
  history: BambuHistoryItem[],
  filters: FilterParams,
): BambuHistoryItem[] {
  let result = history;

  if (filters.status) {
    const statuses = filters.status.split(',').map(s => Number(s.trim()));
    result = result.filter(item => statuses.includes(item.status));
  }

  if (filters.device) {
    const deviceLower = filters.device.toLowerCase();
    result = result.filter(item =>
      (item.deviceName ?? '').toLowerCase().includes(deviceLower),
    );
  }

  if (filters.dateFrom) {
    result = result.filter(item => (item.startTime ?? '') >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    const to = filters.dateTo + 'T23:59:59';
    result = result.filter(item => (item.startTime ?? '') <= to);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(item => {
      const title = (item.designTitle ?? item.title ?? '').toLowerCase();
      return title.includes(searchLower);
    });
  }

  return result;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return { data, total, page: safePage, pageSize, totalPages };
}

export function extractDeviceList(history: BambuHistoryItem[]): string[] {
  const deviceSet = new Set<string>();
  for (const item of history) {
    if (item.deviceName) deviceSet.add(item.deviceName);
  }
  return Array.from(deviceSet).sort();
}
