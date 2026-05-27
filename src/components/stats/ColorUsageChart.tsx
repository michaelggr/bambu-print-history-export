/**
 * 颜色使用量对比组件 — 水平柱状图（带颜色色块）
 */

import { formatWeight } from '@/utils/format';
import { EmptyBlock } from './shared';

export default function ColorUsageChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <EmptyBlock />;

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      {entries.map(([color, weight]) => (
        <div key={color} className="flex items-center gap-3">
          {/* 颜色色块 */}
          <div className="h-4 w-4 shrink-0 rounded border border-[var(--border)]" style={{ background: color }} />
          <span className="w-16 shrink-0 text-xs text-[var(--text-secondary)]">{color}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--bg-primary)]">
            <div className="h-full rounded transition-all" style={{ width: `${(weight / maxVal) * 100}%`, background: color, opacity: 0.7 }} />
          </div>
          <span className="w-16 text-right font-mono-heading text-xs text-[var(--text-primary)]">{formatWeight(weight)}</span>
        </div>
      ))}
    </div>
  );
}
