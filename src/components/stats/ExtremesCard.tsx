/**
 * 之最统计卡片组件
 */

import { formatWeight } from '@/utils/format';
import type { PeriodStats } from '@/types/bambu';

/** 格式化小时数 */
function fmtHours(h: number): string {
  if (!h || h <= 0) return '-';
  if (h >= 24) return `${(h / 24).toFixed(1)}天`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.round(h * 60)}m`;
}

export default function ExtremesCard({ extremes }: { extremes: PeriodStats['extremes'] }) {
  const items = [
    { label: '最长打印', name: extremes.longest.name, value: fmtHours(extremes.longest.hours) },
    { label: '最短打印', name: extremes.shortest.name, value: fmtHours(extremes.shortest.hours) },
    { label: '最重打印', name: extremes.heaviest.name, value: formatWeight(extremes.heaviest.weight_g) },
    { label: '最轻打印', name: extremes.lightest.name, value: formatWeight(extremes.lightest.weight_g) },
    { label: '最多颜色', name: extremes.most_colors.name, value: extremes.most_colors.count > 0 ? `${extremes.most_colors.count} 色` : '-' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
          <p className="text-xs text-[var(--text-muted)]">{it.label}</p>
          <p className="mt-1 truncate font-mono-heading text-lg font-bold text-[var(--accent)]" title={it.name}>{it.name || '-'}</p>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
