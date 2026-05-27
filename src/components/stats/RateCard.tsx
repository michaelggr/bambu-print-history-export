/**
 * 占比指标卡片组件（超500g / 多色模型）
 */

export default function RateCard({ label, count, rate, total }: { label: string; count: number; rate: number; total: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-mono-heading text-2xl font-bold text-[var(--accent)]">{rate}%</span>
        <span className="text-xs text-[var(--text-secondary)]">{count}/{total} 次</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  );
}
