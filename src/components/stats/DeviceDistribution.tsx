/**
 * 设备分布卡片组件
 */

import { EmptyBlock } from './shared';
import type { PeriodStats } from '@/types/bambu';

export default function DeviceDistribution({ devices }: { devices: PeriodStats['devices'] }) {
  const entries = Object.entries(devices);
  if (entries.length === 0) return <EmptyBlock />;

  return (
    <div className="space-y-3">
      {entries.map(([name, d]) => {
        const rate = d.count > 0 ? (d.success / d.count) * 100 : 0;
        return (
          <div key={name} className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-primary)]">{name}</span>
              <span className="font-mono-heading text-[var(--text-secondary)]">
                {d.count} 次 · 成功率 {rate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${Math.min(rate, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
