/** 打印状态 → 中文文本（Bambu API: 1=取消, 2=成功, 3=失败, 4=取消） */
export function statusText(status: number): string {
  const map: Record<number, string> = {
    2: '成功',
    3: '失败',
    1: '取消',
    4: '取消',
  };
  return map[status] ?? '未知';
}

/** 打印状态 → Tailwind 颜色类名 */
export function statusColor(status: number): string {
  const map: Record<number, string> = {
    2: 'text-green-400 bg-green-400/10',
    3: 'text-red-400 bg-red-400/10',
    1: 'text-gray-400 bg-gray-400/10',
    4: 'text-gray-400 bg-gray-400/10',
  };
  return map[status] ?? 'text-gray-500 bg-gray-500/10';
}

/** ISO 日期字符串 → 可读格式 */
export function formatDateTime(isoStr: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 秒数 → 可读时长 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** 克数 → 可读重量 */
export function formatWeight(grams: number): string {
  if (!grams || grams <= 0) return '-';
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${grams.toFixed(1)}g`;
}

/** 颜色字符串 → #RRGGBB（支持多种格式） */
export function rgbaToHex(color: string): string {
  if (!color) return '';
  const s = String(color).trim();

  // 已经是 #RRGGBB 格式
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  // #RRGGBBAA → #RRGGBB
  if (/^#[0-9A-Fa-f]{8}$/.test(s)) return s.slice(0, 7);

  // 无#前缀的 hex（如 "FFFFFFFF" RGBA 或 "1F79E5" RGB）
  if (/^[0-9A-Fa-f]{8}$/.test(s)) return `#${s.slice(0, 6).toUpperCase()}`;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s.toUpperCase()}`;

  // rgba(r,g,b,a) 或 rgb(r,g,b) → #RRGGBB
  const rgbaMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return s;
}
