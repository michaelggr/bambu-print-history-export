/**
 * History 页面辅助函数
 */

import { rgbaToHex } from '@/utils/format';
import type { BambuHistoryItem } from '@/types/bambu';

/** 提取耗材信息（取第一个 AMS 耗材） */
export function extractFilamentInfo(record: BambuHistoryItem): { type: string; color: string } {
  const amsList = record.amsDetailMapping;
  if (Array.isArray(amsList) && amsList.length > 0) {
    const first = amsList[0];
    return {
      type: first?.filamentType ?? record.filamentType ?? '',
      color: first?.sourceColor ? rgbaToHex(first.sourceColor) : (record.filamentColor ? rgbaToHex(record.filamentColor) : ''),
    };
  }
  return {
    type: record.filamentType ?? '',
    color: record.filamentColor ? rgbaToHex(record.filamentColor) : '',
  };
}

/** 格式化长度（mm → m） */
export function formatLength(mm: number): string {
  if (!mm || mm <= 0) return '-';
  const m = mm / 1000;
  return `${m.toFixed(1)}m`;
}

/** 切片模式映射 */
export function sliceModeLabel(mode?: string): string {
  if (!mode) return '-';
  if (mode === 'cloud_slice') return '云端';
  if (mode === 'local') return '本地';
  return mode;
}
