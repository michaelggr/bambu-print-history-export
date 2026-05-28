/**
 * 数据导入层（纯前端）
 * 支持三种格式：JSON（原始数据）、CSV、HA printer_analytics
 * 两种模式：增量合并（去重）、覆盖替换
 */

import type { BambuHistoryItem, HAFormat } from '@/types/bambu';
import * as bambuCache from './bambu-cache';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type ImportFormat = 'json' | 'csv' | 'ha';

export interface ImportSuccess {
  success: true;
  format: ImportFormat;
  data: BambuHistoryItem[];
}

export interface ImportError {
  success: false;
  error: string;
}

export type ImportResult = ImportSuccess | ImportError;

export interface ImportMergeResult {
  added: number;
  skipped: number;
  total: number;
}

export interface ImportOverwriteResult {
  total: number;
}

// ---------------------------------------------------------------------------
// 格式检测
// ---------------------------------------------------------------------------

/** 根据文件内容自动检测格式 */
export function detectFormat(content: string): ImportFormat | null {
  const trimmed = content.trim();

  // 空内容
  if (!trimmed) return null;

  // HA 格式：以 { "version": 开头且包含 history 字段
  if (trimmed.startsWith('{') && (trimmed.includes('"version"') || trimmed.includes('"history"'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.version && Array.isArray(parsed.history)) return 'ha';
    } catch { /* 不是有效 JSON 或不是 HA */ }
  }

  // JSON 数组格式：以 [ 开头
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return 'json';
    } catch { /* 不是有效 JSON */ }
  }

  // CSV 格式：包含 BOM 或标准表头（至少 2 列，含逗号）
  const firstLine = trimmed.split('\n')[0];
  const csvHeaders = ['id', 'designtitle', 'status', 'devicename'];
  const hasComma = firstLine.includes(',');
  const headerMatchCount = csvHeaders.filter((h) => firstLine.toLowerCase().includes(h)).length;
  if (hasComma && headerMatchCount >= 2) return 'csv';

  return null;
}

// ---------------------------------------------------------------------------
// JSON 解析
// ---------------------------------------------------------------------------

/** 解析 JSON 格式（BambuHistoryItem[] 原始数组） */
export function parseJSON(content: string): ImportResult {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return { success: false, error: 'JSON 内容必须是数组格式' };
    if (parsed.length === 0) return { success: false, error: 'JSON 数组为空' };
    return { success: true, format: 'json', data: parsed as BambuHistoryItem[] };
  } catch (e) {
    return { success: false, error: `JSON 解析失败: ${e instanceof Error ? e.message : '未知错误'}` };
  }
}

// ---------------------------------------------------------------------------
// CSV 解析
// ---------------------------------------------------------------------------

/** 解析 CSV 格式，映射字段到 BambuHistoryItem */
export function parseCSV(content: string): ImportResult {
  try {
    // 移除 BOM
    let text = content;
    if (text.charCodeAt(0) === 0xFEFF || text.startsWith('\uFEFF')) {
      text = text.slice(1);
    }

    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return { success: false, error: 'CSV 数据不足（需要表头 + 至少一行数据）' };

    // 解析表头
    const headers = parseCSVLine(lines[0]);
    const idIdx = headers.findIndex((h) => h.toLowerCase() === 'id');
    if (idIdx < 0) return { success: false, error: 'CSV 缺少必需的 id 列' };

    // 字段名 → 索引 映射
    const colMap = new Map<string, number>();
    headers.forEach((h, i) => colMap.set(h.toLowerCase(), i));

    // 解析数据行
    const items: BambuHistoryItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length <= idIdx) continue;

      items.push({
        id: String(values[idIdx] ?? ''),
        designTitle: getVal(values, colMap, 'designtitle'),
        status: mapStatus(getVal(values, colMap, 'status')),
        deviceName: getVal(values, colMap, 'devicename'),
        startTime: getVal(values, colMap, 'starttime') || undefined,
        endTime: getVal(values, colMap, 'endtime') || undefined,
        weight: numVal(getVal(values, colMap, 'weight')),
        length: numVal(getVal(values, colMap, 'length')),
        costTime: numVal(getVal(values, colMap, 'costtime')),
        filamentType: getVal(values, colMap, 'filamenttype'),
        mode: getVal(values, colMap, 'mode') || undefined,
        bedType: getVal(values, colMap, 'bedtype') || undefined,
      });
    }

    if (items.length === 0) return { success: false, error: 'CSV 没有有效的数据行' };
    return { success: true, format: 'csv', data: items };
  } catch (e) {
    return { success: false, error: `CSV 解析失败: ${e instanceof Error ? e.message : '未知错误'}` };
  }
}

/** 解析单行 CSV，处理引号包裹和转义 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // 跳过转义引号
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function getVal(values: string[], colMap: Map<string, number>, key: string): string {
  const idx = colMap.get(key);
  return idx !== undefined ? (values[idx] ?? '').trim() : '';
}

function numVal(s: string): number | undefined {
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

/** 中文状态码 → 数字 */
const STATUS_CN_MAP: Record<string, number> = { 成功: 2, 失败: 3, 取消: 1, 已取消: 4, 打印中: 1 };
function mapStatus(s: string): number {
  if (!s) return 0;
  const n = Number(s);
  if (!isNaN(n)) return n;
  return STATUS_CN_MAP[s] ?? 0;
}

// ---------------------------------------------------------------------------
// HA 格式解析
// ---------------------------------------------------------------------------

/** 解析 HA printer_analytics 格式，反向映射到 BambuHistoryItem */
export function parseHA(content: string): ImportResult {
  try {
    const parsed = JSON.parse(content) as unknown as HAFormat;
    if (!parsed?.history || !Array.isArray(parsed.history)) {
      return { success: false, error: 'HA 格式无效：缺少 history 数组或 version 字段' };
    }

    /** HA status → Bambu numeric status */
    const haStatusMap: Record<string, number> = {
      finish: 2,
      failed: 3,
      cancelled: 1,
      running: 1,
    };

    const items: BambuHistoryItem[] = parsed.history.map((rec) => ({
      id: String(rec.design_id ?? `ha-${rec.task_name ?? ''}-${rec.start_time ?? ''}`),
      designTitle: rec.task_name,
      status: haStatusMap[rec.status ?? ''] ?? 0,
      deviceId: rec.printer_serial,
      startTime: rec.start_time ? haTimeToISO(rec.start_time) : undefined,
      endTime: rec.end_time ? haTimeToISO(rec.end_time) : undefined,
      costTime: Math.round((rec.duration_hours ?? 0) * 3600),
      weight: rec.total_weight,
      length: Math.round((rec.total_length ?? 0) * 1000), // m → mm
      filamentType: rec.filament_type,
      filamentColor: rec.filament_color,
      bedType: rec.print_bed_type,
      mode: rec.slice_mode,
      useAms: rec.multi_color ?? false,
      cover: rec.cover_image_url,
    }));

    if (items.length === 0) return { success: false, error: 'HA history 为空' };
    return { success: true, format: 'ha' as ImportFormat, data: items };
  } catch (e) {
    return { success: false, error: `HA 格式解析失败: ${e instanceof Error ? e.message : '未知错误'}` };
  }
}

/** HA 时间格式 "YYYY-MM-DD HH:mm" → ISO */
function haTimeToISO(timeStr: string): string {
  if (!timeStr) return '';
  // 已经是 ISO 或带 T 的格式，直接返回
  if (timeStr.includes('T') || timeStr.includes('-')) return timeStr;
  return timeStr.replace(' ', 'T') + ':00';
}

// ---------------------------------------------------------------------------
// 统一入口：自动检测格式并解析
// ---------------------------------------------------------------------------

/** 自动检测格式并解析文件内容 */
export function parseImportFile(content: string): ImportResult {
  const format = detectFormat(content);
  if (!format) return { success: false, error: '无法识别文件格式（支持 .json / .csv / .ha）' };

  switch (format) {
    case 'json': return parseJSON(content);
    case 'csv': return parseCSV(content);
    case 'ha': return parseHA(content);
  }
}

// ---------------------------------------------------------------------------
// 导入操作
// ---------------------------------------------------------------------------

/**
 * 增量合并：新记录追加，已存在按 ID 跳过
 * 返回 { added, skipped, total }
 */
export function importMerge(items: BambuHistoryItem[]): ImportMergeResult {
  const existingIds = bambuCache.loadExistingIds();
  let added = 0;
  let skipped = 0;

  const newItems = items.filter((item) => {
    const id = String(item.id ?? '');
    if (!id) return false;
    if (existingIds.has(id)) {
      skipped++;
      return false;
    }
    existingIds.add(id); // 防止本次导入内部重复
    added++;
    return true;
  });

  if (newItems.length > 0) {
    const existing = bambuCache.loadHistoryCache();
    const merged = [...newItems, ...existing];
    bambuCache.saveHistoryCache(merged);
  }

  return { added, skipped, total: bambuCache.loadHistoryCache().length };
}

/**
 * 覆盖导入：清空现有缓存，完全替换
 */
export function importOverwrite(items: BambuHistoryItem[]): ImportOverwriteResult {
  bambuCache.saveHistoryCache(items);
  return { total: items.length };
}
