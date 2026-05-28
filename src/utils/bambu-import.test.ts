import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectFormat,
  parseJSON,
  parseCSV,
  parseHA,
  parseImportFile,
  importMerge,
  importOverwrite,
} from './bambu-import';
import * as bambuCache from './bambu-cache';
import type { BambuHistoryItem } from '@/types/bambu';

function makeItem(o: Partial<BambuHistoryItem> = {}): BambuHistoryItem {
  return { id: '1', designTitle: 'T', status: 2, startTime: '2025-01-01T10:00:00Z', ...o };
}

beforeEach(() => localStorage.clear());

// ===========================================================================
// 格式检测
// ===========================================================================

describe('detectFormat', () => {
  it('detects JSON array', () => expect(detectFormat('[{"id":"1"}]')).toBe('json'));
  it('detects CSV with BOM', () => {
    expect(detectFormat('\uFEFFid,status\n1,2')).toBe('csv');
  });
  it('detects CSV without BOM (has comma + 2+ headers)', () => {
    expect(detectFormat('id,designTitle,status\n1,A,2')).toBe('csv');
  });
  it('detects HA format', () => {
    const ha = JSON.stringify({ version: 3, history: [{ task_name: 'X' }] });
    expect(detectFormat(ha)).toBe('ha');
  });
  it('returns null for unknown', () => {
    expect(detectFormat('hello world')).toBeNull();
    expect(detectFormat('')).toBeNull();
  });
});

// ===========================================================================
// JSON 解析
// ===========================================================================

describe('parseJSON', () => {
  it('parses valid array', () => {
    const r = parseJSON(JSON.stringify([makeItem({ id: '10' })]));
    expect(r.success && r.data[0].id).toBe('10');
  });

  it('rejects empty array', () => {
    expect(parseJSON('[]').success).toBe(false);
  });

  it('rejects invalid JSON', () => {
    expect(parseJSON('{bad}').success).toBe(false);
  });

  it('rejects non-array object', () => {
    expect(parseJSON('{}').success).toBe(false);
  });
});

// ===========================================================================
// CSV 解析
// ===========================================================================

const CSV_BOM = '\uFEFFid,designTitle,status,deviceName,startTime,endTime,weight,length,costTime,filamentType,mode,bedType\n201,Model C,2,P1,2025-02-01T10:00:00Z,,50.0,5000,,PLA,cloud_slice,\n202,Model D,3,P2,2025-02-02T12:00:00Z,,30.0,3000,,PETG,local,\n';

const CSV_NO_BOM = 'id,designTitle,status\n301,X,2\n302,Y,3\n';

const CSV_QUOTED = 'id,designTitle,status\n401,"Model, With Comma",2\n';

const CSV_CN_STATUS = 'id,designTitle,status\n501,成功,2\n502,失败,3\n503,取消,1\n';

describe('parseCSV', () => {
  it('parses CSV with BOM', () => {
    const r = parseCSV(CSV_BOM);
    expect(r.success && r.data).toHaveLength(2);
    if (r.success) {
      expect(r.data[0].id).toBe('201');
      expect(r.data[0].filamentType).toBe('PLA');
      expect(r.data[0].mode).toBe('cloud_slice');
      expect(r.data[1].status).toBe(3); // PETG row
    }
  });

  it('parses CSV without BOM', () => {
    const r = parseCSV(CSV_NO_BOM);
    expect(r.success && r.data).toHaveLength(2);
  });

  it('handles quoted fields with commas', () => {
    const r = parseCSV(CSV_QUOTED);
    expect(r.success && r.data[0].designTitle).toBe('Model, With Comma');
  });

  it('maps Chinese status codes', () => {
    const r = parseCSV(CSV_CN_STATUS);
    if (r.success) {
      expect(r.data[0].status).toBe(2); // 成功 → 2
      expect(r.data[1].status).toBe(3); // 失败 → 3
      expect(r.data[2].status).toBe(1); // 取消 → 1
    }
  });

  it('rejects empty string', () => expect(parseCSV('').success).toBe(false));
  it('rejects header-only CSV', () => expect(parseCSV('id,status\n').success).toBe(false));
  it('rejects missing id column', () =>
    expect(parseCSV('name,status\nA,2').success).toBe(false));
});

// ===========================================================================
// HA 解析
// ===========================================================================

const HA_NORMAL = JSON.stringify({
  version: 3,
  history: [
    {
      task_name: 'M1',
      status: 'finish',
      design_id: '9001',
      printer_serial: 'P1',
      start_time: '2025-03-01 08:00',
      end_time: '2025-03-01 09:30',
      duration_hours: 1.5,
      filament_type: 'ABS',
      total_weight: 80,
      total_length: 20,
    },
  ],
});

const HA_NO_DESIGN_ID = JSON.stringify({
  version: 3,
  history: [
    {
      task_name: 'NoDesignId',
      status: 'failed',
      start_time: '2025-04-01 10:00',
      end_time: '',
      duration_hours: 0.5,
      filament_type: 'PLA',
      total_weight: 25,
      total_length: 8,
    },
  ],
});

const HA_ALL_STATUSES = JSON.stringify({
  version: 3,
  history: [
    { task_name: 'F', status: 'finish', design_id: 's1', start_time: '2025-05-01 08:00' },
    { task_name: 'R', status: 'running', design_id: 's2', start_time: '2025-05-02 08:00' },
    { task_name: 'C', status: 'cancelled', design_id: 's3', start_time: '2025-05-03 08:00' },
    { task_name: 'X', status: 'unknown', design_id: 's4', start_time: '2025-05-04 08:00' },
  ],
});

describe('parseHA', () => {
  it('parses normal HA with design_id', () => {
    const r = parseHA(HA_NORMAL);
    expect(r.success && r.data[0].id).toBe('9001');
    if (r.success) {
      expect(r.data[0].status).toBe(2);       // finish → 2
      expect(r.data[0].weight).toBe(80);
      expect(r.data[0].length).toBe(20000);     // 20m → 20000mm
    }
  });

  it('generates ha-prefixed ID when design_id is missing', () => {
    const r = parseHA(HA_NO_DESIGN_ID);
    if (r.success) {
      expect(r.data[0].id).toContain('ha-');
      expect(r.data[0].designTitle).toBe('NoDesignId');
    }
  });

  it('maps all HA statuses correctly', () => {
    const r = parseHA(HA_ALL_STATUSES);
    if (r.success) {
      expect(r.data[0].status).toBe(2);  // finish
      expect(r.data[1].status).toBe(1);  // running
      expect(r.data[2].status).toBe(1);  // cancelled
      expect(r.data[3].status).toBe(0);  // unknown → default
    }
  });

  it('rejects invalid format', () => expect(parseHA('bad').success).toBe(false));
  it('rejects missing history field', () =>
    expect(parseHA(JSON.stringify({ version: 3 })).success).toBe(false));
  it('rejects empty history array', () =>
    expect(parseHA(JSON.stringify({ version: 3, history: [] })).success).toBe(false));
});

// ===========================================================================
// 统一入口 parseImportFile
// ===========================================================================

describe('parseImportFile', () => {
  it('auto-detects and parses JSON', () => {
    const json = JSON.stringify([makeItem({ id: '99' })]);
    const r = parseImportFile(json);
    expect(r.success && r.format).toBe('json');
  });

  it('auto-detects and parses CSV', () => {
    const r = parseImportFile(CSV_NO_BOM);
    expect(r.success && r.format).toBe('csv');
  });

  it('auto-detects and parses HA', () => {
    const r = parseImportFile(HA_NORMAL);
    expect(r.success && r.format).toBe('ha');
  });

  it('returns error for unknown format', () => {
    const r = parseImportFile('totally unknown');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('无法识别');
  });
});

// ===========================================================================
// 导入模式
// ===========================================================================

describe('importMerge', () => {
  it('merges new items, skips by ID', () => {
    bambuCache.saveHistoryCache([makeItem({ id: '1' })]);
    const incoming = [makeItem({ id: '1' }), makeItem({ id: '2' })];
    const r = importMerge(incoming);
    expect(r.added).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.total).toBe(2);
  });

  it('does not overwrite existing data on skip', () => {
    bambuCache.saveHistoryCache([makeItem({ id: '1', designTitle: 'Original' })]);
    importMerge([makeItem({ id: '1', designTitle: 'Changed' })]);
    expect(bambuCache.loadHistoryCache().find(i => i.id === '1')?.designTitle)
      .toBe('Original');
  });

  it('handles empty existing cache', () => {
    const r = importMerge([makeItem({ id: '99' })]);
    expect(r.added).toBe(1);
    expect(r.total).toBe(1);
  });

  it('skips items with empty ID', () => {
    const r = importMerge([makeItem({ id: '' }), makeItem({ id: '10' })]);
    expect(r.added).toBe(1);
  });
});

describe('importOverwrite', () => {
  it('replaces all data', () => {
    bambuCache.saveHistoryCache([makeItem({ id: '1' }), makeItem({ id: '2' })]);
    const r = importOverwrite([makeItem({ id: '100' })]);
    expect(r.total).toBe(1);
    expect(bambuCache.loadHistoryCache()[0].id).toBe('100');
  });
});
