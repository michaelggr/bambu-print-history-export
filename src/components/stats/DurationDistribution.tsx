/**
 * 时长分布组件 — 水平柱状图
 */

/** 时长分布桶名称 */
const DURATION_BUCKETS = ['0-30分钟', '30-60分钟', '1-3小时', '3-6小时', '6-12小时', '12小时+'];

export default function DurationDistribution({ dist }: { dist: Record<string, number> }) {
  const maxVal = Math.max(...DURATION_BUCKETS.map((b) => dist[b] ?? 0), 1);

  return (
    <div className="space-y-2">
      {DURATION_BUCKETS.map((bucket) => {
        const val = dist[bucket] ?? 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={bucket} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-right text-xs text-[var(--text-secondary)]">{bucket}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--bg-primary)]">
              <div className="h-full rounded bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right font-mono-heading text-xs text-[var(--text-primary)]">{val}</span>
          </div>
        );
      })}
    </div>
  );
}
