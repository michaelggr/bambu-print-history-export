/**
 * 数据转换层（纯前端）
 * 从后端 api/services/bambu.ts 完整移植的纯函数，
 * 包含颜色解析、时间格式化、HA 格式转换、CSV 生成等。
 */

import type { BambuHistoryItem, HARecord, HAFormat } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 颜色解析
// ---------------------------------------------------------------------------

/** 颜色字符串 → hex 格式 '#RRGGBB' */
export function parseColor(colorStr?: string | null): string {
  if (!colorStr) return '';
  const s = String(colorStr).trim();

  // 已经是 #hex 格式
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    return hex.length >= 6 ? `#${hex.slice(0, 6).toUpperCase()}` : s.toUpperCase();
  }

  // rgba(r,g,b,a) 或 rgb(r,g,b)
  if (s.startsWith('rgb')) {
    try {
      const inner = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'));
      const parts = inner.split(',').map(p => p.trim());
      const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2]);
      return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
    } catch {
      return s;
    }
  }

  // 逗号分隔的 RGBA 值
  if (s.includes(',')) {
    try {
      const parts = s.split(',').map(p => p.trim());
      const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2]);
      return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
    } catch { /* 继续尝试 */ }
  }

  // 无#前缀的 hex 字符串（如 "1F79E5FF" RGBA 或 "1F79E5" RGB）
  if (s.length >= 6) {
    try {
      parseInt(s.slice(0, 6), 16);
      return `#${s.slice(0, 6).toUpperCase()}`;
    } catch { /* 继续回退 */ }
  }

  return s;
}

// ---------------------------------------------------------------------------
// 时间与状态解析
// ---------------------------------------------------------------------------

/** ISO 8601 时间字符串 → 本地时间 'YYYY-MM-DD HH:mm' */
export function parseTime(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return isoStr.slice(0, 16);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  } catch {
    return isoStr.slice(0, 16);
  }
}

/** Bambu 状态码 → HA 状态字符串（英文） */
export function parseStatus(statusCode: number): string {
  const mapping: Record<number, string> = { 2: 'finish', 3: 'failed', 1: 'cancelled', 4: 'cancelled' };
  return mapping[statusCode] ?? 'cancelled';
}

/** Bambu 状态码 → 中文（用于 CSV 导出和 UI 展示） */
export const STATUS_MAP_CN: Record<number, string> = {
  1: '取消',
  2: '成功',
  3: '失败',
  4: '取消',
};

// ---------------------------------------------------------------------------
// 数据提取辅助函数
// ---------------------------------------------------------------------------

/** 从记录中提取使用的颜色列表 */
export function extractColorsUsed(item: BambuHistoryItem): string[] {
  const colors: string[] = [];

  // 优先从 amsDetailMapping 提取
  const amsList = item.amsDetailMapping;
  if (Array.isArray(amsList)) {
    for (const ams of amsList) {
      if (ams?.sourceColor) {
        const parsed = parseColor(ams.sourceColor);
        if (parsed && !colors.includes(parsed)) colors.push(parsed);
      }
    }
  }

  // 回退：从 filament 提取
  if (colors.length === 0 && item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      if (fil?.color) {
        const parsed = parseColor(fil.color);
        if (parsed && !colors.includes(parsed)) colors.push(parsed);
      }
    }
  }

  // 再回退：从 filamentColor 提取
  if (colors.length === 0 && item.filamentColor) {
    for (const c of String(item.filamentColor).split(';')) {
      const parsed = parseColor(c.trim());
      if (parsed && !colors.includes(parsed)) colors.push(parsed);
    }
  }

  return colors;
}

/** 提取耗材类型和颜色（取第一个耗材） */
export function extractFilamentInfo(item: BambuHistoryItem): { type: string; color: string } {
  let filamentType = '';
  let filamentColor = '';

  // 优先从 amsDetailMapping 提取
  const amsList = item.amsDetailMapping;
  if (Array.isArray(amsList) && amsList.length > 0) {
    const first = amsList[0];
    filamentType = first?.filamentType ?? '';
    filamentColor = first?.sourceColor ? parseColor(first.sourceColor) : '';
  }

  // 回退：从 filament 字段提取
  if (!filamentType && item.filament && typeof item.filament === 'object') {
    for (const key of Object.keys(item.filament).sort()) {
      const fil = item.filament[key];
      if (!filamentType) filamentType = fil?.type ?? '';
      if (!filamentColor) filamentColor = fil?.color ? parseColor(fil.color) : '';
      if (filamentType && filamentColor) break;
    }
  }

  // 再回退到顶层字段
  if (!filamentType) filamentType = item.filamentType ?? '';
  if (!filamentColor) filamentColor = parseColor(item.filamentColor);

  return { type: filamentType, color: filamentColor };
}

/** 提取总重量(g)和总长度(m) */
export function extractWeightAndLength(item: BambuHistoryItem): { weight: number; length: number } {
  let totalWeight = 0;
  let totalLength = 0;

  // 从 filament 字段汇总
  if (item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      totalWeight += Number(fil?.weight ?? 0) || 0;
      totalLength += (Number(fil?.length ?? 0) || 0) / 1000; // mm → m
    }
  }

  // 回退到顶层字段
  if (totalWeight === 0) totalWeight = Number(item.weight ?? 0) || 0;
  if (totalLength === 0) totalLength = (Number(item.length ?? 0) || 0) / 1000;

  return { weight: Math.round(totalWeight * 10) / 10, length: Math.round(totalLength * 10) / 10 };
}

/** 提取耗材类型列表（去重） */
export function extractTypesUsed(item: BambuHistoryItem): string[] {
  const types: string[] = [];
  const amsList = item.amsDetailMapping;
  if (Array.isArray(amsList)) {
    for (const ams of amsList) {
      if (ams?.filamentType && !types.includes(ams.filamentType)) {
        types.push(ams.filamentType);
      }
    }
  }
  if (types.length === 0 && item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      if (fil?.type && !types.includes(fil.type)) types.push(fil.type);
    }
  }
  if (types.length === 0 && item.filamentType) {
    types.push(item.filamentType);
  }
  return types;
}

/** 提取 color_usage 详情 */
function extractColorUsage(item: BambuHistoryItem): HARecord['color_usage'] {
  const amsList = item.amsDetailMapping;
  if (!Array.isArray(amsList) || amsList.length === 0) return [];

  return amsList.map(ams => ({
    color: parseColor(ams.sourceColor),
    type: ams.filamentType ?? '',
    weight_g: Math.round((Number(ams.weight ?? 0) || 0) * 100) / 100,
    length_m: Math.round(((Number(ams.length ?? 0) || 0) / 1000) * 100) / 100,
  }));
}

/** 提取喷嘴类型 */
function extractNozzleType(item: BambuHistoryItem): string {
  if (Array.isArray(item.nozzleInfos) && item.nozzleInfos.length > 0) {
    return item.nozzleInfos[0].type ?? '';
  }
  return '';
}

// ---------------------------------------------------------------------------
// HA 格式转换
// ---------------------------------------------------------------------------

/** 将 Bambu Cloud 数据转为 HA printer_analytics v3 导入格式 */
export function convertToHAFormat(history: BambuHistoryItem[]): HAFormat {
  const haRecords: HARecord[] = history.map(item => {
    const { type: filamentType, color: filamentColor } = extractFilamentInfo(item);
    const { weight: totalWeight, length: totalLength } = extractWeightAndLength(item);
    const colorsUsed = extractColorsUsed(item);
    const typesUsed = extractTypesUsed(item);
    const colorUsage = extractColorUsage(item);

    const costSeconds = Number(item.costTime ?? 0) || 0;
    const durationHours = Math.round(costSeconds / 3600 * 100) / 100;

    const nozzleSize = (Array.isArray(item.nozzleInfos) && item.nozzleInfos.length > 0 && item.nozzleInfos[0].diameter)
      ? String(item.nozzleInfos[0].diameter)
      : String(item.nozzleSize ?? '0.4');
    const taskName = item.designTitle ?? item.title ?? '';
    const totalColors = colorsUsed.length;

    return {
      task_name: taskName,
      status: parseStatus(item.status ?? 0),
      design_id: item.designId ?? '',
      printer_serial: String(item.deviceId ?? ''),
      start_time: parseTime(item.startTime),
      end_time: parseTime(item.endTime),
      duration_hours: durationHours,
      prepare_time_minutes: null,
      filament_type: filamentType,
      filament_color: filamentColor,
      total_weight: totalWeight,
      total_length: totalLength,
      colors_used: colorsUsed,
      types_used: typesUsed,
      total_colors: totalColors,
      multi_color: totalColors > 1,
      over_500g: totalWeight > 500,
      color_usage: colorUsage,
      energy_kwh: null,
      nozzle_type: extractNozzleType(item),
      nozzle_size: nozzleSize,
      print_bed_type: item.bedType ?? '',
      speed_profile: null,
      slice_mode: item.mode ?? '',
      ams_used: item.useAms ?? false,
      total_layer_count: null,
      progress: item.status === 2 ? 100 : (Number(item.progress ?? 0) || 0),
      cover_image_url: item.cover ?? '',
    };
  });

  return { version: 3, history: haRecords };
}

// ---------------------------------------------------------------------------
// CSV 生成
// ---------------------------------------------------------------------------

/** 生成 CSV 字符串（含 BOM 头，确保 Excel 正确识别 UTF-8） */
export function generateCSV(history: BambuHistoryItem[]): string {
  const columns = [
    'id', 'designTitle', 'status', 'deviceName', 'deviceModel',
    'startTime', 'endTime', 'weight', 'length', 'costTime',
    'filamentType', 'mode', 'bedType',
  ];

  const header = columns.join(',');

  const rows = history.map(item => {
    const statusRaw = item.status;
    const statusStr = typeof statusRaw === 'number'
      ? (STATUS_MAP_CN[statusRaw] ?? String(statusRaw))
      : String(statusRaw);

    return columns.map(col => {
      let val: unknown;
      if (col === 'status') {
        val = statusStr;
      } else if (col === 'filamentType') {
        const ams = item.amsDetailMapping;
        val = Array.isArray(ams) && ams.length > 0 ? ams[0].filamentType : (item.filamentType ?? '');
      } else {
        val = (item as Record<string, unknown>)[col] ?? '';
      }

      const str = String(val);
      // CSV 转义：包含逗号、引号、换行时用双引号包裹
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  // BOM 头 + CSV 内容
  return '\uFEFF' + [header, ...rows].join('\n');
}
