﻿﻿﻿﻿﻿﻿export function statusText(status: number): string {
  const map: Record<number, string> = { 2: '成功', 3: '失败', 1: '取消', 4: '取消' };
  return map[status] ?? '未知';
}

export function statusColor(status: number): string {
  const map: Record<number, string> = {
    2: '#00D4AA', 3: '#FF6B6B', 1: '#5E5E78', 4: '#5E5E78',
  };
  return map[status] ?? '#5E5E78';
}

export function formatDateTime(isoStr: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

export function formatWeight(grams: number): string {
  if (!grams || grams <= 0) return '-';
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${grams.toFixed(1)}g`;
}

// 毫米转米
export function formatLength(mm: number): string {
  if (!mm || mm <= 0) return '-';
  const m = mm / 1000;
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${m.toFixed(1)}m`;
}

// 切片模式标签
export function sliceModeLabel(mode?: string): string {
  if (mode === 'cloud_slice') return '云端';
  if (mode === 'local') return '本地';
  return mode || '-';
}

// rgba/rgb/hex 颜色转 hex
export function rgbaToHex(color: string): string {
  if (!color) return '#999999';
  if (color.startsWith('#')) return color.length === 9 ? color.slice(0, 7) : color;

  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  return '#999999';
}
