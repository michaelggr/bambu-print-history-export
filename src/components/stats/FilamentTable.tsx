/**
 * 耗材统计表组件
 */

import { formatWeight } from '@/utils/format';
import { EmptyBlock } from './shared';

/** 成功率颜色 */
function rateColor(rate: number): string {
  if (rate >= 90) return '#00E676';
  if (rate >= 70) return '#FFB300';
  return '#FF5252';
}

interface FilamentSuccessDetail {
  total: number;
  success: number;
  failed: number;
  cancelled: number;
  success_rate: number;
  weight_g: number;
}

export default function FilamentTable({ data }: { data: Record<string, FilamentSuccessDetail> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <EmptyBlock />;

  return (
    <div className="rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-tertiary)]">
            <th className="px-2 py-2 text-left text-[var(--text-secondary)]">类型</th>
            <th className="px-2 py-2 text-right text-[var(--text-secondary)]">次数</th>
            <th className="px-2 py-2 text-right text-[var(--text-secondary)]">成功</th>
            <th className="px-2 py-2 text-right text-[var(--text-secondary)]">失败</th>
            <th className="px-2 py-2 text-right text-[var(--text-secondary)]">重量</th>
            <th className="px-2 py-2 text-right text-[var(--text-secondary)]">成功率</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([type, s], i) => (
            <tr key={type} className={i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]/40'}>
              <td className="px-2 py-2 text-[var(--text-primary)]">{type}</td>
              <td className="px-2 py-2 text-right font-mono-heading text-[var(--text-primary)]">{s.total}</td>
              <td className="px-2 py-2 text-right font-mono-heading text-[#00E676]">{s.success}</td>
              <td className="px-2 py-2 text-right font-mono-heading text-[#FF5252]">{s.failed}</td>
              <td className="px-2 py-2 text-right font-mono-heading text-[var(--text-primary)]">{formatWeight(s.weight_g)}</td>
              <td className="px-2 py-2 text-right">
                <span className="font-mono-heading" style={{ color: rateColor(s.success_rate) }}>{s.success_rate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
