import { describe, it, expect, beforeEach } from 'vitest';
import { saveHistoryCache, loadExistingIds } from './bambu-cache';
import type { BambuHistoryItem } from '@/types/bambu';

describe('Incremental update ID matching', () => {
  beforeEach(() => localStorage.clear());

  it('loadExistingIds stores all IDs as strings', () => {
    const items: BambuHistoryItem[] = [
      { id: '1001', title: 'A', status: 2 },
      { id: '1002', title: 'B', status: 2 },
      { id: 'str-999', title: 'C', status: 3 },
    ];

    saveHistoryCache(items);
    const ids = loadExistingIds();

    expect(ids.has('1001')).toBe(true);
    expect(ids.has('1002')).toBe(true);
    expect(ids.has('str-999')).toBe(true);
    expect(ids.size).toBe(3);
  });

  it('filter using String() matches cached string IDs correctly', () => {
    saveHistoryCache([
      { id: '1001', title: 'Old A', status: 2 },
      { id: '1002', title: 'Old B', status: 3 },
    ]);

    const existingIds = loadExistingIds();

    // 模拟 API 返回的数据（含已存在 + 新记录）
    const allItems: BambuHistoryItem[] = [
      { id: '1001', title: 'Old A', status: 2 },   // 已存在，应被过滤
      { id: '1002', title: 'Old B', status: 3 },   // 已存在，应被过滤
      { id: '2001', title: 'New C', status: 2 },   // 新记录，应保留
    ];

    // 使用与 fetchHistory 相同的过滤逻辑：String() 转换后匹配
    const filtered = allItems.filter(
      (item) => !existingIds.has(String(item.id ?? '')),
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('2001');
  });

  it('empty existingIds results in no filtering (all items are "new")', () => {
    const emptyIds = new Set<string>();

    const items: BambuHistoryItem[] = [
      { id: '1001', title: 'A', status: 2 },
      { id: '1002', title: 'B', status: 3 },
    ];

    const filtered = items.filter(
      (item) => !emptyIds.has(String(item.id ?? '')),
    );

    // 没有已存在的 ID，所有记录都被当作新记录
    expect(filtered.length).toBe(2);
  });
});
