/**
 * 活动热力图组件 — 仿 GitHub 贡献图
 */

import { useState } from 'react';
import { EmptyBlock } from './shared';

/** 热力图颜色等级 */
const HEAT_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

function heatColor(count: number): string {
  if (count === 0) return HEAT_COLORS[0];
  if (count <= 2) return HEAT_COLORS[1];
  if (count <= 5) return HEAT_COLORS[2];
  if (count <= 8) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

export default function ActivityHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const dates = Object.keys(heatmap);
  if (dates.length === 0) return <EmptyBlock />;

  // 最近 12 个月
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 12);

  // 生成所有日期
  const allDates: string[] = [];
  const cur = new Date(startDate);
  while (cur <= today) {
    allDates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  // 按周分组
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  const firstDay = new Date(allDates[0] + 'T00:00:00');
  const firstDow = firstDay.getDay();
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
  for (let i = 0; i < mondayOffset; i++) currentWeek.push('');
  if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  for (const d of allDates) {
    currentWeek.push(d);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push('');
    weeks.push(currentWeek);
  }

  // 月份标签
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = '';
  weeks.forEach((week, colIdx) => {
    const firstValid = week.find((d) => d);
    if (firstValid) {
      const m = firstValid.slice(0, 7);
      if (m !== lastMonth) { lastMonth = m; monthLabels.push({ label: m, col: colIdx }); }
    }
  });

  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  // 统计最大值用于图例
  const maxCount = Math.max(...Object.values(heatmap), 0);

  return (
    <div>
      {/* 月份标签 */}
      <div className="mb-1 flex" style={{ paddingLeft: 28 }}>
        {monthLabels.map(({ label, col }) => (
          <span key={label + col} className="text-[10px] text-[var(--text-muted)]"
            style={{ position: 'relative', left: `${col * 13}px`, width: 0, whiteSpace: 'nowrap' }}>
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {/* 星期标签 */}
        <div className="flex flex-col gap-0.5">
          {dayLabels.map((d, i) => (
            <span key={i} className="flex h-[11px] items-center text-[10px] text-[var(--text-muted)]" style={{ width: 24 }}>
              {i % 2 === 0 ? d : ''}
            </span>
          ))}
        </div>
        {/* 热力方块 */}
        <div className="flex gap-0.5" onMouseLeave={() => setTooltip(null)}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((date, di) => {
                const count = date ? (heatmap[date] ?? 0) : -1;
                return (
                  <div
                    key={di}
                    className="h-[11px] w-[11px] rounded-[2px] cursor-default transition-transform hover:scale-150 hover:z-10"
                    style={{ background: date ? heatColor(count) : 'transparent' }}
                    onMouseEnter={(e) => {
                      if (!date) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ date, count, x: rect.left + rect.width / 2, y: rect.top });
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* 图例 */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
        <span>少</span>
        {HEAT_COLORS.map((c, i) => (
          <div key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: c }} />
        ))}
        <span>多</span>
        {maxCount > 0 && <span className="ml-2">最多 {maxCount} 次/天</span>}
      </div>
      {/* Tooltip — 使用 fixed 定位跟随鼠标 */}
      {tooltip && (
        <div className="pointer-events-none fixed z-50 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-lg border border-[var(--border)] whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y - 32, transform: 'translateX(-50%)' }}>
          {tooltip.date}：{tooltip.count} 次
        </div>
      )}
    </div>
  );
}
