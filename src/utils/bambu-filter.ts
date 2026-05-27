/**
 * 筛选与分页逻辑（纯前端）
 * 从后端 history.ts 的 applyFilters() 和 paginate() 移植
 */

import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 筛选参数
// ---------------------------------------------------------------------------

export interface FilterParams {
  status?: string;
  device?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ---------------------------------------------------------------------------
// 筛选
// ---------------------------------------------------------------------------

/** 对历史记录应用筛选条件 */
export function applyFilters(
  history: BambuHistoryItem[],
  filters: FilterParams,
): BambuHistoryItem[] {
  let result = history;

  if (filters.status) {
    // 支持逗号分隔的多个状态值
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
    // dateTo 包含当天，比较到当天末尾
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

// ---------------------------------------------------------------------------
// 分页
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 分页处理 */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const data = items.slice(start, start + pageSize);

  return { data, total, page: safePage, pageSize, totalPages };
}

// ---------------------------------------------------------------------------
// 设备列表提取
// ---------------------------------------------------------------------------

/** 从历史记录中提取全部设备名（排序去重） */
export function extractDeviceList(history: BambuHistoryItem[]): string[] {
  const deviceSet = new Set<string>();
  for (const item of history) {
    if (item.deviceName) deviceSet.add(item.deviceName);
  }
  return Array.from(deviceSet).sort();
}
