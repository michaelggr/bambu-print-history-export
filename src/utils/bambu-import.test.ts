import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectFormat,
  parseJSON,
  parseCSV,
  parseHA,
  importMerge,
  importOverwrite,
} from './bambu-import';
import * as bambuCache from './bambu-cache';
import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 测试数据工厂
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<BambuHistoryItem> = {}): BambuHistoryItem {
  return {
    id: '1',
    designTitle: 'Test Model',
    status: 2,
    startTime: '2025-01-01T10:00:00Z',
    ...overrides,
  };
}

const SAMPLE_JSON = JSON.stringify([
  makeItem({ id: '101', designTitle: 'Model A', status: 2 }),
  makeItem({ id: '102', designTitle: 'Model B', status: 3 }),
]);

const SAMPLE_CSV =
  '\uFEFFid,designTitle,status,deviceName,startTime,endTime,weight,length,costTime,filamentType,mode,bedType\n' +
  '201,Model C,2,Printer1,2025-02-01T10:00:00Z,,50.0,5000,PLA,cloud_slice,\n' +
  '202,Model D,3,Printer2,2025-02-02T12:00:00Z,,30.0,3000,PETG,local,\n';

const SAMPLE_HA = JSON.stringify({
  version: 3,
  history: [
    {
      task_name: 'Model E',
      status: 'finish',
      design_id: '301',
      printer_serial: 'PRINTER3',
      start_time: '2025-03-01 08:00',
      end_time: '2025-03-01 09:30',
      duration_hours: 1.5,
      filament_type: 'ABS',
      total_weight: 80,
      total_length: 20,
    },
    {
      task_name: 'Model F',
      status: 'failed',
      design_id: '302',
      printer_serial: 'PRINTER4',
      start_time: '2025-03-02 14:00',
      end_time: '',
      duration_hours: 0.5,
      filament_type: 'PLA',
      total_weight: 25,
      total_length: 8,
    },
  ],
});

beforeEach(() => localStorage.clear());

// ---------------------------------------------------------------------------
// 格式检测
// ---------------------------------------------------------------------------

describe('detectFormat', () => {
  it('detects JSON array format', () => {
    expect(detectFormat(SAMPLE_JSON)).toBe('json');
  });

  it('detects CSV format (BOM header)', () => {
    expect(detectFormat(SAMPLE_CSV)).toBe('csv');
  });

  it('detects HA format', () => {
    expect(detectFormat(SAMPLE_HA)).toBe('ha');
  });

  it('returns null for unknown format', () => {
    expect(detectFormat('not a valid file')).toBeNull();
    expect(detectFormat('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// JSON 解析
// ---------------------------------------------------------------------------

describe('parseJSON', () => {
  it('parses valid JSON array into BambuHistoryItem[]', () => {
    const result = parseJSON(SAMPLE_JSON);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('101');
      expect(result.data[1].designTitle).toBe('Model B');
    }
  });

  it('returns error for invalid JSON', () => {
    const result = parseJSON('{invalid json}');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('JSON');
    }
  });

  it('returns error for non-array JSON', () => {
    const result = parseJSON('{"not": "array"}');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CSV 解析
// ---------------------------------------------------------------------------

describe('parseCSV', () => {
  it('parses valid CSV with correct field mapping', () => {
    const result = parseCSV(SAMPLE_CSV);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('201');
      expect(result.data[0].designTitle).toBe('Model C');
      expect(result.data[0].status).toBe(2);
      expect(result.data[1].deviceName).toBe('Printer2');
    }
  });

  it('returns error for empty CSV', () => {
    const result = parseCSV('');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HA 解析
// ---------------------------------------------------------------------------

describe('parseHA', () => {
  it('parses valid HA format and maps to BambuHistoryItem', () => {
    const result = parseHA(SAMPLE_HA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      // HA status → Bambu numeric status
      expect(result.data[0].status).toBe(2);  // finish → 2
      expect(result.data[1].status).toBe(3);  // failed → 3
      expect(result.data[0].designTitle).toBe('Model E');
    }
  });

  it('returns error for invalid HA format', () => {
    const result = parseHA('not ha format');
    expect(result.success).toBe(false);
  });

  it('returns error for missing history field', () => {
    const result = parseHA(JSON.stringify({ version: 3 }));
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 导入模式：增量合并
// ---------------------------------------------------------------------------

describe('importMerge (增量合并)', () => {
  it('adds new items and skips existing by ID', () => {
    // 现有缓存有 id=1
    bambuCache.saveHistoryCache([makeItem({ id: '1' })]);

    const incoming: BambuHistoryItem[] = [
      makeItem({ id: '1', designTitle: 'Updated' }),  // 已存在，跳过
      makeItem({ id: '2', designTitle: 'New Item' }),   // 新增
    ];

    const result = importMerge(incoming);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(2);

    // 验证缓存：原有数据不被覆盖
    const cached = bambuCache.loadHistoryCache();
    expect(cached).toHaveLength(2);
    expect(cached.find((i) => i.id === '1')?.designTitle).toBe('Test Model'); // 保持原值
  });

  it('handles empty existing cache', () => {
    const incoming = [makeItem({ id: '10' })];
    const result = importMerge(incoming);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 导入模式：覆盖
// ---------------------------------------------------------------------------

describe('importOverwrite (覆盖导入)', () => {
  it('replaces all existing data', () => {
    bambuCache.saveHistoryCache([makeItem({ id: '1' }), makeItem({ id: '2' })]);

    const incoming: BambuHistoryItem[] = [makeItem({ id: '100' })];
    const result = importOverwrite(incoming);

    expect(result.total).toBe(1);

    const cached = bambuCache.loadHistoryCache();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('100');
  });
});
