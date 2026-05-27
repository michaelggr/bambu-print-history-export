import { describe, it, expect } from 'vitest';
import { applyFilters, paginate, extractDeviceList } from './bambu-filter';
import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 测试用 fixture
// ---------------------------------------------------------------------------

function createItem(overrides: Partial<BambuHistoryItem> = {}): BambuHistoryItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 6)}`,
    designTitle: '测试模型',
    status: 2,
    deviceName: 'X1C',
    startTime: '2025-06-15T10:00:00Z',
    ...overrides,
  };
}

const ALL_ITEMS: BambuHistoryItem[] = [
  createItem({ id: '1', designTitle: '模型A', status: 2, deviceName: 'X1C', startTime: '2025-06-10T10:00:00Z' }),
  createItem({ id: '2', designTitle: '模型B', status: 3, deviceName: 'P1S', startTime: '2025-06-12T10:00:00Z' }),
  createItem({ id: '3', designTitle: '模型C', status: 1, deviceName: 'X1C', startTime: '2025-06-15T10:00:00Z' }),
  createItem({ id: '4', designTitle: '模型D', status: 4, deviceName: 'A1 Mini', startTime: '2025-06-20T10:00:00Z' }),
  createItem({ id: '5', designTitle: '模型E', status: 2, deviceName: 'P1S', startTime: '2025-06-25T10:00:00Z' }),
];

// ---------------------------------------------------------------------------
// applyFilters
// ---------------------------------------------------------------------------

describe('applyFilters', () => {
  it('无筛选条件返回全部', () => {
    expect(applyFilters(ALL_ITEMS, {})).toHaveLength(5);
  });

  it('按状态筛选', () => {
    expect(applyFilters(ALL_ITEMS, { status: '2' })).toHaveLength(2); // 成功
    expect(applyFilters(ALL_ITEMS, { status: '3' })).toHaveLength(1); // 失败
  });

  it('按多状态筛选（逗号分隔）', () => {
    // 1=取消, 4=取消
    expect(applyFilters(ALL_ITEMS, { status: '1,4' })).toHaveLength(2);
  });

  it('按设备筛选（不区分大小写）', () => {
    expect(applyFilters(ALL_ITEMS, { device: 'x1c' })).toHaveLength(2);
    expect(applyFilters(ALL_ITEMS, { device: 'P1S' })).toHaveLength(2);
  });

  it('按起始日期筛选', () => {
    const result = applyFilters(ALL_ITEMS, { dateFrom: '2025-06-15' });
    expect(result).toHaveLength(3); // 6-15, 6-20, 6-25
  });

  it('按结束日期筛选（包含当天）', () => {
    const result = applyFilters(ALL_ITEMS, { dateTo: '2025-06-15' });
    expect(result).toHaveLength(3); // 6-10, 6-12, 6-15
  });

  it('按日期范围筛选', () => {
    const result = applyFilters(ALL_ITEMS, { dateFrom: '2025-06-12', dateTo: '2025-06-20' });
    expect(result).toHaveLength(3); // 6-12, 6-15, 6-20
  });

  it('按关键词搜索（不区分大小写）', () => {
    expect(applyFilters(ALL_ITEMS, { search: '模型a' })).toHaveLength(1);
    expect(applyFilters(ALL_ITEMS, { search: '模型' })).toHaveLength(5);
  });

  it('组合筛选', () => {
    const result = applyFilters(ALL_ITEMS, { status: '2', device: 'P1S' });
    expect(result).toHaveLength(1); // 只有 id=5 同时满足
  });

  it('筛选结果为空', () => {
    expect(applyFilters(ALL_ITEMS, { device: '不存在的设备' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// paginate
// ---------------------------------------------------------------------------

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it('第一页', () => {
    const result = paginate(items, 1, 10);
    expect(result.data).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it('最后一页（不满）', () => {
    const result = paginate(items, 3, 10);
    expect(result.data).toHaveLength(5);
    expect(result.page).toBe(3);
  });

  it('页码超出范围自动修正', () => {
    const result = paginate(items, 99, 10);
    expect(result.page).toBe(3); // 修正到最后一页
  });

  it('空数组', () => {
    const result = paginate([], 1, 10);
    expect(result.data).toHaveLength(0);
    expect(result.totalPages).toBe(1); // 至少1页
  });

  it('单页', () => {
    const result = paginate([1, 2, 3], 1, 10);
    expect(result.data).toHaveLength(3);
    expect(result.totalPages).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// extractDeviceList
// ---------------------------------------------------------------------------

describe('extractDeviceList', () => {
  it('提取去重排序的设备名', () => {
    const devices = extractDeviceList(ALL_ITEMS);
    expect(devices).toEqual(['A1 Mini', 'P1S', 'X1C']);
  });

  it('空数组返回空列表', () => {
    expect(extractDeviceList([])).toEqual([]);
  });

  it('无 deviceName 的记录被跳过', () => {
    const items = [createItem({ deviceName: undefined })];
    expect(extractDeviceList(items)).toEqual([]);
  });
});
