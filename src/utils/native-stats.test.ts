import { describe, it, expect } from 'vitest';
import { calculateNativeStats } from './native-stats';
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
    endTime: '2025-06-15T14:00:00Z',
    costTime: 14400, // 4小时
    weight: 100,
    length: 30000,
    mode: 'cloud_slice',
    nozzleSize: '0.4',
    filamentType: 'PLA',
    filamentColor: '#FF0000',
    amsDetailMapping: [
      { filamentType: 'PLA', sourceColor: '#FF0000', weight: 100, length: 30000 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateNativeStats
// ---------------------------------------------------------------------------

describe('calculateNativeStats', () => {
  it('空数组返回零值统计', () => {
    const stats = calculateNativeStats([]);
    expect(stats.stats_lifetime.total_prints).toBe(0);
    expect(stats.stats_lifetime.successful_prints).toBe(0);
    expect(stats.stats_7d.total_prints).toBe(0);
    expect(stats.stats_30d.total_prints).toBe(0);
  });

  it('正确统计成功/失败/取消数', () => {
    const items = [
      createItem({ id: '1', status: 2 }),
      createItem({ id: '2', status: 2 }),
      createItem({ id: '3', status: 3 }),
      createItem({ id: '4', status: 1 }),
      createItem({ id: '5', status: 4 }),
    ];
    const stats = calculateNativeStats(items);
    const lt = stats.stats_lifetime;
    expect(lt.total_prints).toBe(5);
    expect(lt.successful_prints).toBe(2);
    expect(lt.failed_prints).toBe(1);
    expect(lt.cancelled_prints).toBe(2);
  });

  it('计算成功率', () => {
    const items = [
      createItem({ id: '1', status: 2 }),
      createItem({ id: '2', status: 3 }),
    ];
    const stats = calculateNativeStats(items);
    expect(stats.stats_lifetime.success_rate).toBe(50);
  });

  it('统计总重量（取消的不计入）', () => {
    const items = [
      createItem({ id: '1', status: 2, weight: 100 }),
      createItem({ id: '2', status: 3, weight: 50 }),
      createItem({ id: '3', status: 1, weight: 200 }),
    ];
    const stats = calculateNativeStats(items);
    // 取消(status=1)不计入重量
    expect(stats.stats_lifetime.total_weight_g).toBe(150);
  });

  it('统计总时长', () => {
    const items = [
      createItem({ id: '1', costTime: 3600 }),   // 1小时
      createItem({ id: '2', costTime: 7200 }),   // 2小时
    ];
    const stats = calculateNativeStats(items);
    expect(stats.stats_lifetime.total_duration_hours).toBe(3);
  });

  it('设备统计', () => {
    const items = [
      createItem({ id: '1', deviceName: 'X1C', status: 2 }),
      createItem({ id: '2', deviceName: 'X1C', status: 3 }),
      createItem({ id: '3', deviceName: 'P1S', status: 2 }),
    ];
    const stats = calculateNativeStats(items);
    const devices = stats.stats_lifetime.devices;
    expect(devices['X1C'].count).toBe(2);
    expect(devices['X1C'].success).toBe(1);
    expect(devices['X1C'].failed).toBe(1);
    expect(devices['P1S'].count).toBe(1);
  });

  it('耗材统计', () => {
    // amsDetailMapping 优先于顶层 filamentType，所以两条记录的 ams 都只有 PLA
    const items = [
      createItem({ id: '1', filamentType: 'PLA', status: 2, weight: 100 }),
      createItem({ id: '2', filamentType: 'PETG', status: 2, weight: 50,
        amsDetailMapping: [{ filamentType: 'PETG', sourceColor: '#00FF00', weight: 50, length: 15000 }],
      }),
    ];
    const stats = calculateNativeStats(items);
    const filaments = stats.stats_lifetime.filaments;
    expect(filaments['PLA'].count).toBe(1);
    expect(filaments['PETG'].count).toBe(1);
  });

  it('活动热力图', () => {
    const items = [
      createItem({ id: '1', startTime: '2025-06-15T10:00:00Z' }),
      createItem({ id: '2', startTime: '2025-06-15T14:00:00Z' }),
      createItem({ id: '3', startTime: '2025-06-16T10:00:00Z' }),
    ];
    const stats = calculateNativeStats(items);
    expect(stats.activity_heatmap['2025-06-15']).toBe(2);
    expect(stats.activity_heatmap['2025-06-16']).toBe(1);
  });

  it('时长分布', () => {
    // costTime 单位是秒，1800s=30min → '30-60分钟'（30 不满足 <30）
    const items = [
      createItem({ id: '1', costTime: 1800 }),   // 30分钟 → 30-60分钟
      createItem({ id: '2', costTime: 7200 }),   // 120分钟 → 1-3小时
      createItem({ id: '3', costTime: 36000 }),  // 600分钟 → 6-12小时
    ];
    const stats = calculateNativeStats(items);
    const dist = stats.stats_lifetime.duration_distribution;
    expect(dist['30-60分钟']).toBe(1);
    expect(dist['1-3小时']).toBe(1);
    expect(dist['6-12小时']).toBe(1);
  });

  it('极值追踪（仅成功的记录参与）', () => {
    const items = [
      createItem({ id: '1', status: 2, designTitle: '长模型', costTime: 72000, weight: 600 }),
      createItem({ id: '2', status: 2, designTitle: '短模型', costTime: 600, weight: 5 }),
      createItem({ id: '3', status: 3, designTitle: '失败模型', costTime: 144000, weight: 1000 }),
    ];
    const stats = calculateNativeStats(items);
    const ext = stats.stats_lifetime.extremes;
    expect(ext.longest.name).toBe('长模型');
    expect(ext.shortest.name).toBe('短模型');
    expect(ext.heaviest.name).toBe('长模型');
    expect(ext.lightest.name).toBe('短模型');
  });

  it('7天和30天统计', () => {
    const now = new Date();
    const within7d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const within30d = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const items = [
      createItem({ id: '1', startTime: within7d }),
      createItem({ id: '2', startTime: within30d }),
      createItem({ id: '3', startTime: old }),
    ];
    const stats = calculateNativeStats(items);
    expect(stats.stats_7d.total_prints).toBe(1);
    expect(stats.stats_30d.total_prints).toBe(2);
    expect(stats.stats_lifetime.total_prints).toBe(3);
  });

  it('颜色使用量统计', () => {
    const items = [
      createItem({
        id: '1',
        amsDetailMapping: [
          { filamentType: 'PLA', sourceColor: '#FF0000', weight: 50, length: 15000 },
          { filamentType: 'PLA', sourceColor: '#00FF00', weight: 30, length: 9000 },
        ],
      }),
    ];
    const stats = calculateNativeStats(items);
    expect(stats.color_usage_stats['#FF0000']).toBe(50);
    expect(stats.color_usage_stats['#00FF00']).toBe(30);
  });
});
