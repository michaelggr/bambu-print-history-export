import { describe, it, expect } from 'vitest';
import {
  parseColor,
  parseTime,
  parseStatus,
  STATUS_MAP_CN,
  extractColorsUsed,
  extractFilamentInfo,
  extractWeightAndLength,
  extractTypesUsed,
  convertToHAFormat,
  generateCSV,
} from './bambu-transform';
import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 测试用 fixture
// ---------------------------------------------------------------------------

/** 构造一条标准的打印历史记录 */
function createItem(overrides: Partial<BambuHistoryItem> = {}): BambuHistoryItem {
  return {
    id: 'test-001',
    designTitle: '测试模型',
    status: 2,
    deviceName: 'Bambu X1C',
    deviceId: 'SN001',
    startTime: '2025-06-15T10:30:00Z',
    endTime: '2025-06-15T14:30:00Z',
    costTime: 14400,
    weight: 120,
    length: 36000,
    cover: 'https://example.com/cover.png',
    filamentType: 'PLA',
    filamentColor: '1F79E5FF',
    mode: 'cloud_slice',
    bedType: 'textured_plate',
    useAms: true,
    nozzleSize: '0.4',
    amsDetailMapping: [
      { filamentType: 'PLA', sourceColor: '1F79E5FF', weight: 80, length: 24000 },
      { filamentType: 'PETG', sourceColor: '#FF0000', weight: 40, length: 12000 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseColor
// ---------------------------------------------------------------------------

describe('parseColor', () => {
  it('无#前缀的 RGBA hex → #RRGGBB', () => {
    expect(parseColor('1F79E5FF')).toBe('#1F79E5');
  });

  it('无#前缀的 RGB hex → #RRGGBB', () => {
    expect(parseColor('1F79E5')).toBe('#1F79E5');
  });

  it('已有 # 前缀的 hex → 保持大写', () => {
    expect(parseColor('#ff0000')).toBe('#FF0000');
  });

  it('rgba() 格式 → #RRGGBB', () => {
    expect(parseColor('rgba(255, 0, 128, 1)')).toBe('#FF0080');
  });

  it('rgb() 格式 → #RRGGBB', () => {
    expect(parseColor('rgb(0, 128, 255)')).toBe('#0080FF');
  });

  it('逗号分隔 RGBA → #RRGGBB', () => {
    expect(parseColor('255, 0, 0, 255')).toBe('#FF0000');
  });

  it('空值返回空字符串', () => {
    expect(parseColor('')).toBe('');
    expect(parseColor(null)).toBe('');
    expect(parseColor(undefined)).toBe('');
  });

  it('短于6位的 hex 原样返回大写', () => {
    expect(parseColor('#abc')).toBe('#ABC');
  });
});

// ---------------------------------------------------------------------------
// parseTime
// ---------------------------------------------------------------------------

describe('parseTime', () => {
  it('ISO 8601 → 本地时间格式', () => {
    const result = parseTime('2025-06-15T10:30:00Z');
    // 结果取决于时区，但格式应为 YYYY-MM-DD HH:mm
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('空值返回空字符串', () => {
    expect(parseTime('')).toBe('');
    expect(parseTime(undefined)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseStatus
// ---------------------------------------------------------------------------

describe('parseStatus', () => {
  it('2 → finish', () => expect(parseStatus(2)).toBe('finish'));
  it('3 → failed', () => expect(parseStatus(3)).toBe('failed'));
  it('1 → cancelled', () => expect(parseStatus(1)).toBe('cancelled'));
  it('4 → cancelled', () => expect(parseStatus(4)).toBe('cancelled'));
  it('未知状态码 → cancelled', () => expect(parseStatus(99)).toBe('cancelled'));
});

// ---------------------------------------------------------------------------
// STATUS_MAP_CN
// ---------------------------------------------------------------------------

describe('STATUS_MAP_CN', () => {
  it('1 和 4 都映射为取消', () => {
    expect(STATUS_MAP_CN[1]).toBe('取消');
    expect(STATUS_MAP_CN[4]).toBe('取消');
  });
  it('2 → 成功', () => expect(STATUS_MAP_CN[2]).toBe('成功'));
  it('3 → 失败', () => expect(STATUS_MAP_CN[3]).toBe('失败'));
});

// ---------------------------------------------------------------------------
// extractColorsUsed
// ---------------------------------------------------------------------------

describe('extractColorsUsed', () => {
  it('从 amsDetailMapping 提取颜色', () => {
    const item = createItem();
    const colors = extractColorsUsed(item);
    expect(colors).toContain('#1F79E5');
    expect(colors).toContain('#FF0000');
    expect(colors).toHaveLength(2);
  });

  it('回退到 filament 字段', () => {
    const item = createItem({
      amsDetailMapping: undefined,
      filament: {
        '0': { type: 'PLA', color: '#00FF00', weight: 100, length: 30000 },
      },
    });
    const colors = extractColorsUsed(item);
    expect(colors).toContain('#00FF00');
  });

  it('回退到 filamentColor 字段', () => {
    const item = createItem({
      amsDetailMapping: undefined,
      filament: undefined,
      filamentColor: '#AA0000;#00BB00',
    });
    const colors = extractColorsUsed(item);
    expect(colors).toContain('#AA0000');
    expect(colors).toContain('#00BB00');
  });

  it('去重', () => {
    const item = createItem({
      amsDetailMapping: [
        { filamentType: 'PLA', sourceColor: '#FF0000', weight: 50, length: 15000 },
        { filamentType: 'PLA', sourceColor: '#FF0000', weight: 30, length: 9000 },
      ],
    });
    expect(extractColorsUsed(item)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// extractFilamentInfo
// ---------------------------------------------------------------------------

describe('extractFilamentInfo', () => {
  it('从 amsDetailMapping 提取第一个耗材', () => {
    const item = createItem();
    const info = extractFilamentInfo(item);
    expect(info.type).toBe('PLA');
    expect(info.color).toBe('#1F79E5');
  });

  it('回退到顶层字段', () => {
    const item = createItem({ amsDetailMapping: undefined, filament: undefined });
    const info = extractFilamentInfo(item);
    expect(info.type).toBe('PLA');
    expect(info.color).toBe('#1F79E5');
  });
});

// ---------------------------------------------------------------------------
// extractWeightAndLength
// ---------------------------------------------------------------------------

describe('extractWeightAndLength', () => {
  it('从 filament 字段汇总（mm→m 转换）', () => {
    const item = createItem({
      filament: {
        '0': { type: 'PLA', color: '#FF0000', weight: 80, length: 24000 },
        '1': { type: 'PETG', color: '#00FF00', weight: 40, length: 12000 },
      },
    });
    const result = extractWeightAndLength(item);
    expect(result.weight).toBe(120);   // 80 + 40
    expect(result.length).toBe(36);    // (24000 + 12000) / 1000
  });

  it('回退到顶层字段', () => {
    const item = createItem({ filament: undefined });
    const result = extractWeightAndLength(item);
    expect(result.weight).toBe(120);
    expect(result.length).toBe(36);    // 36000 / 1000
  });
});

// ---------------------------------------------------------------------------
// extractTypesUsed
// ---------------------------------------------------------------------------

describe('extractTypesUsed', () => {
  it('从 amsDetailMapping 提取去重类型', () => {
    const item = createItem();
    const types = extractTypesUsed(item);
    expect(types).toContain('PLA');
    expect(types).toContain('PETG');
  });

  it('回退到顶层 filamentType', () => {
    const item = createItem({ amsDetailMapping: undefined, filament: undefined });
    expect(extractTypesUsed(item)).toEqual(['PLA']);
  });
});

// ---------------------------------------------------------------------------
// convertToHAFormat
// ---------------------------------------------------------------------------

describe('convertToHAFormat', () => {
  it('正确转换单条记录', () => {
    const item = createItem();
    const result = convertToHAFormat([item]);

    expect(result.version).toBe(3);
    expect(result.history).toHaveLength(1);

    const ha = result.history[0];
    expect(ha.task_name).toBe('测试模型');
    expect(ha.status).toBe('finish');
    expect(ha.duration_hours).toBe(4);  // 14400s / 3600
    expect(ha.total_weight).toBe(120);
    expect(ha.total_length).toBe(36);   // 36000mm → 36m
    expect(ha.ams_used).toBe(true);
    expect(ha.slice_mode).toBe('cloud_slice');
    expect(ha.energy_kwh).toBeNull();
    expect(ha.prepare_time_minutes).toBeNull();
    expect(ha.colors_used).toContain('#1F79E5');
    expect(ha.types_used).toContain('PLA');
    expect(ha.multi_color).toBe(true);
    expect(ha.over_500g).toBe(false);
    expect(ha.cover_image_url).toBe('https://example.com/cover.png');
  });

  it('status=3 → failed', () => {
    const result = convertToHAFormat([createItem({ status: 3 })]);
    expect(result.history[0].status).toBe('failed');
  });

  it('status=1 → cancelled', () => {
    const result = convertToHAFormat([createItem({ status: 1 })]);
    expect(result.history[0].status).toBe('cancelled');
  });

  it('空数组返回空 history', () => {
    const result = convertToHAFormat([]);
    expect(result.history).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateCSV
// ---------------------------------------------------------------------------

describe('generateCSV', () => {
  it('包含 BOM 头', () => {
    const csv = generateCSV([createItem()]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('包含表头行', () => {
    const csv = generateCSV([createItem()]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('id,designTitle,status');
  });

  it('状态码转为中文', () => {
    const csv = generateCSV([createItem({ status: 2 })]);
    expect(csv).toContain('成功');
  });

  it('CSV 转义：包含逗号时用双引号包裹', () => {
    const csv = generateCSV([createItem({ designTitle: 'Hello, World' })]);
    expect(csv).toContain('"Hello, World"');
  });

  it('空数组只输出 BOM + 表头', () => {
    const csv = generateCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // BOM+header，无数据行
  });
});
