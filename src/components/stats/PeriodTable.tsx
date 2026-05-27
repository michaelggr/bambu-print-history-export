/**
 * 周期对比表组件
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

export default function PeriodTable({ s7, s30, life }: { s7: PeriodStats; s30: PeriodStats; life: PeriodStats }) {
  const rows: { label: string; v7: string | number; v30: string | number; vLife: string | number }[] = [
    { label: '打印次数', v7: s7.total_prints, v30: s30.total_prints, vLife: life.total_prints },
    { label: '成功次数', v7: s7.successful_prints, v30: s30.successful_prints, vLife: life.successful_prints },
    { label: '失败次数', v7: s7.failed_prints, v30: s30.failed_prints, vLife: life.failed_prints },
    { label: '取消次数', v7: s7.cancelled_prints, v30: s30.cancelled_prints, vLife: life.cancelled_prints },
    { label: '成功率', v7: `${s7.success_rate}%`, v30: `${s30.success_rate}%`, vLife: `${life.success_rate}%` },
    { label: '总耗材', v7: formatWeight(s7.total_weight_g), v30: formatWeight(s30.total_weight_g), vLife: formatWeight(life.total_weight_g) },
    { label: '总时长', v7: fmtHours(s7.total_duration_hours), v30: fmtHours(s30.total_duration_hours), vLife: fmtHours(life.total_duration_hours) },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-tertiary)]">
            <th className="px-4 py-2.5 text-left text-[var(--text-secondary)]">指标</th>
            <th className="px-4 py-2.5 text-right text-[var(--text-secondary)]">7天</th>
            <th className="px-4 py-2.5 text-right text-[var(--text-secondary)]">30天</th>
            <th className="px-4 py-2.5 text-right text-[var(--text-secondary)]">终身</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className={i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]/40'}>
              <td className="px-4 py-2 text-[var(--text-primary)]">{r.label}</td>
              <td className="px-4 py-2 text-right font-mono-heading text-[var(--text-primary)]">{r.v7}</td>
              <td className="px-4 py-2 text-right font-mono-heading text-[var(--text-primary)]">{r.v30}</td>
              <td className="px-4 py-2 text-right font-mono-heading text-[var(--accent)]">{r.vLife}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
