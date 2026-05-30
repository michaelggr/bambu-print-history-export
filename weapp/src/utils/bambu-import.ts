﻿﻿﻿﻿﻿﻿import type { BambuHistoryItem, HAFormat } from '@/types/bambu';
import * as bambuCache from './bambu-cache';

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

export function detectFormat(content: string): ImportFormat | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') && (trimmed.includes('"version"') || trimmed.includes('"history"'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.version && Array.isArray(parsed.history)) return 'ha';
    } catch {}
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return 'json';
    } catch {}
  }

  const firstLine = trimmed.split('\n')[0];
  const csvHeaders = ['id', 'designtitle', 'status', 'devicename'];
  const hasComma = firstLine.includes(',');
  const headerMatchCount = csvHeaders.filter(h => firstLine.toLowerCase().includes(h)).length;
  if (hasComma && headerMatchCount >= 2) return 'csv';

  return null;
}

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

export function parseCSV(content: string): ImportResult {
  try {
    let text = content;
    if (text.charCodeAt(0) === 0xFEFF || text.startsWith('\uFEFF')) {
      text = text.slice(1);
    }

    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { success: false, error: 'CSV 数据不足' };

    const headers = parseCSVLine(lines[0]);
    const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
    if (idIdx < 0) return { success: false, error: 'CSV 缺少必需的 id 列' };

    const colMap = new Map<string, number>();
    headers.forEach((h, i) => colMap.set(h.toLowerCase(), i));

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

    if (items.length === 0) return { success: false, error: 'CSV 没有有效数据行' };
    return { success: true, format: 'csv', data: items };
  } catch (e) {
    return { success: false, error: `CSV 解析失败: ${e instanceof Error ? e.message : '未知错误'}` };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
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

const STATUS_CN_MAP: Record<string, number> = { 成功: 2, 失败: 3, 取消: 1, 已取消: 4, 打印中: 1 };
function mapStatus(s: string): number {
  if (!s) return 0;
  const n = Number(s);
  if (!isNaN(n)) return n;
  return STATUS_CN_MAP[s] ?? 0;
}

export function parseHA(content: string): ImportResult {
  try {
    const parsed = JSON.parse(content) as unknown as HAFormat;
    if (!parsed?.history || !Array.isArray(parsed.history)) {
      return { success: false, error: 'HA 格式无效：缺少 history 数组' };
    }

    const haStatusMap: Record<string, number> = {
      finish: 2, failed: 3, cancelled: 1, running: 1,
    };

    const items: BambuHistoryItem[] = parsed.history.map(rec => {
      const did = rec.design_id;
      const id = did ? String(did) : `ha-${rec.task_name ?? ''}-${rec.start_time ?? ''}`;
      return {
        id,
        designTitle: rec.task_name,
        status: haStatusMap[rec.status ?? ''] ?? 0,
        deviceId: rec.printer_serial,
        startTime: rec.start_time ? haTimeToISO(rec.start_time) : undefined,
        endTime: rec.end_time ? haTimeToISO(rec.end_time) : undefined,
        costTime: Math.round((rec.duration_hours ?? 0) * 3600),
        weight: rec.total_weight,
        length: Math.round((rec.total_length ?? 0) * 1000),
        filamentType: rec.filament_type,
        filamentColor: rec.filament_color,
        bedType: rec.print_bed_type,
        mode: rec.slice_mode,
        useAms: rec.multi_color ?? false,
        cover: rec.cover_image_url,
      };
    });

    if (items.length === 0) return { success: false, error: 'HA history 为空' };
    return { success: true, format: 'ha' as ImportFormat, data: items };
  } catch (e) {
    return { success: false, error: `HA 格式解析失败: ${e instanceof Error ? e.message : '未知错误'}` };
  }
}

function haTimeToISO(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T') || timeStr.includes('-')) return timeStr;
  return timeStr.replace(' ', 'T') + ':00';
}

export function parseImportFile(content: string): ImportResult {
  const format = detectFormat(content);
  if (!format) return { success: false, error: '无法识别文件格式（支持 .json / .csv / .ha）' };

  switch (format) {
    case 'json': return parseJSON(content);
    case 'csv': return parseCSV(content);
    case 'ha': return parseHA(content);
  }
}

export function importMerge(items: BambuHistoryItem[]): ImportMergeResult {
  const existingIds = bambuCache.loadExistingIds();
  let added = 0;
  let skipped = 0;

  const newItems = items.filter(item => {
    const id = String(item.id ?? '');
    if (!id) return false;
    if (existingIds.has(id)) {
      skipped++;
      return false;
    }
    existingIds.add(id);
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

export function importOverwrite(items: BambuHistoryItem[]): ImportOverwriteResult {
  bambuCache.saveHistoryCache(items);
  return { total: items.length };
}
