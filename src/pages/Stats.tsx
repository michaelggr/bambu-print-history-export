import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Printer, TrendingUp, Package, Clock, Monitor, Palette,
  RefreshCw, Camera, CheckCircle2, Share2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import { formatWeight } from '@/utils/format';
import { isNative } from '@/utils/platform';

// ---------------------------------------------------------------------------
// 类型定义 — 对齐后端 StatsResult 结构
// ---------------------------------------------------------------------------

interface DeviceStats {
  count: number;
  success: number;
  failed: number;
  weight_g: number;
}

interface FilamentStats {
  count: number;
  weight_g: number;
  success: number;
  failed: number;
}

interface FilamentSuccessDetail {
  total: number;
  success: number;
  failed: number;
  cancelled: number;
  success_rate: number;
  weight_g: number;
}

interface PeriodStats {
  total_prints: number;
  successful_prints: number;
  failed_prints: number;
  cancelled_prints: number;
  success_rate: number;
  total_weight_g: number;
  total_duration_hours: number;
  devices: Record<string, DeviceStats>;
  filaments: Record<string, FilamentStats>;
  monthly: Record<string, number>;
  duration_distribution: Record<string, number>;
  failure_stage_distribution: Record<string, number>;
  extremes: {
    longest: { name: string; hours: number };
    shortest: { name: string; hours: number };
    heaviest: { name: string; weight_g: number };
    lightest: { name: string; weight_g: number };
  };
  nozzle_size_distribution: Record<string, number>;
  over_500g_count: number;
  over_500g_rate: number;
  slice_mode_distribution: Record<string, number>;
  multi_color_count: number;
  multi_color_rate: number;
}

interface StatsData {
  stats_lifetime: PeriodStats;
  stats_7d: PeriodStats;
  stats_30d: PeriodStats;
  activity_heatmap: Record<string, number>;
  filament_success_stats: Record<string, FilamentSuccessDetail>;
  color_usage_stats: Record<string, number>;
}

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const DURATION_BUCKETS = ['0-30分钟', '30-60分钟', '1-3小时', '3-6小时', '6-12小时', '12小时+'];

/** 热力图颜色等级 — 渐变更明显 */
const HEAT_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

/** 切片模式中文映射 */
const SLICE_MODE_LABELS: Record<string, string> = {
  cloud_slice: '云切片',
  local: '本地切片',
  unknown: '未知',
};

/** 饼图配色 */
const PIE_COLORS = ['#00E676', '#FFB300', '#FF5252', '#29B6F6', '#AB47BC', '#FF7043', '#26C6DA'];

function heatColor(count: number): string {
  if (count === 0) return HEAT_COLORS[0];
  if (count <= 2) return HEAT_COLORS[1];
  if (count <= 5) return HEAT_COLORS[2];
  if (count <= 8) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

function rateColor(rate: number): string {
  if (rate >= 90) return '#00E676';
  if (rate >= 70) return '#FFB300';
  return '#FF5252';
}

function fmtHours(h: number): string {
  if (!h || h <= 0) return '-';
  if (h >= 24) return `${(h / 24).toFixed(1)}天`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.round(h * 60)}m`;
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

/** 周期对比表 */
function PeriodTable({ s7, s30, life }: { s7: PeriodStats; s30: PeriodStats; life: PeriodStats }) {
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

/** 设备分布卡片 */
function DeviceDistribution({ devices }: { devices: PeriodStats['devices'] }) {
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

/** 耗材统计表 */
function FilamentTable({ data }: { data: Record<string, FilamentSuccessDetail> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <EmptyBlock />;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-tertiary)]">
            <th className="px-3 py-2 text-left text-[var(--text-secondary)]">类型</th>
            <th className="px-3 py-2 text-right text-[var(--text-secondary)]">次数</th>
            <th className="px-3 py-2 text-right text-[var(--text-secondary)]">成功</th>
            <th className="px-3 py-2 text-right text-[var(--text-secondary)]">失败</th>
            <th className="px-3 py-2 text-right text-[var(--text-secondary)]">取消</th>
            <th className="px-3 py-2 text-right text-[var(--text-secondary)]">重量</th>
            <th className="px-3 py-2 text-right text-[var(--text-secondary)]">成功率</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([type, s], i) => (
            <tr key={type} className={i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]/40'}>
              <td className="px-3 py-2 text-[var(--text-primary)]">{type}</td>
              <td className="px-3 py-2 text-right font-mono-heading text-[var(--text-primary)]">{s.total}</td>
              <td className="px-3 py-2 text-right font-mono-heading text-[#00E676]">{s.success}</td>
              <td className="px-3 py-2 text-right font-mono-heading text-[#FF5252]">{s.failed}</td>
              <td className="px-3 py-2 text-right font-mono-heading text-[var(--text-muted)]">{s.cancelled}</td>
              <td className="px-3 py-2 text-right font-mono-heading text-[var(--text-primary)]">{formatWeight(s.weight_g)}</td>
              <td className="px-3 py-2 text-right">
                <span className="font-mono-heading" style={{ color: rateColor(s.success_rate) }}>{s.success_rate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 月度趋势图 */
function MonthlyChart({ monthly }: { monthly: Record<string, number> }) {
  const data = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  if (data.length === 0) return <EmptyBlock />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00E676" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2D3142" />
        <XAxis dataKey="month" stroke="#9AA0A6" tick={{ fontSize: 12 }} />
        <YAxis stroke="#9AA0A6" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#1A1D2E', border: '1px solid #2D3142', borderRadius: 8, color: '#E8EAED' }}
          labelFormatter={(v) => `${v}`}
          formatter={(v: number) => [`${v} 次`, '打印次数']}
        />
        <Area type="monotone" dataKey="count" stroke="#00E676" fill="url(#greenGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** 活动热力图 — 仿 GitHub 贡献图（优化版） */
function ActivityHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
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

/** 时长分布 — 水平柱状图 */
function DurationDistribution({ dist }: { dist: Record<string, number> }) {
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

/** 之最统计卡片 */
function ExtremesCard({ extremes }: { extremes: PeriodStats['extremes'] }) {
  const items = [
    { label: '最长打印', name: extremes.longest.name, value: fmtHours(extremes.longest.hours) },
    { label: '最重打印', name: extremes.heaviest.name, value: formatWeight(extremes.heaviest.weight_g) },
    { label: '最短打印', name: extremes.shortest.name, value: fmtHours(extremes.shortest.hours) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

/** 喷嘴尺寸分布 — 饼图 */
function NozzleSizeChart({ dist }: { dist: Record<string, number> }) {
  const entries = Object.entries(dist);
  if (entries.length === 0) return <EmptyBlock />;

  const data = entries.map(([size, count]) => ({ name: `${size}mm`, value: count }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2D3142', borderRadius: 8, color: '#E8EAED' }} />
        <Legend formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** 切片模式分布 — 饼图 */
function SliceModeChart({ dist }: { dist: Record<string, number> }) {
  const entries = Object.entries(dist);
  if (entries.length === 0) return <EmptyBlock />;

  const data = entries.map(([mode, count]) => ({ name: SLICE_MODE_LABELS[mode] || mode, value: count }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2D3142', borderRadius: 8, color: '#E8EAED' }} />
        <Legend formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** 占比指标卡片（超500g / 多色模型） */
function RateCard({ label, count, rate, total }: { label: string; count: number; rate: number; total: number }) {
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

/** 颜色使用量对比 — 水平柱状图（带颜色色块） */
function ColorUsageChart({ data }: { data: Record<string, number> }) {
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

/** 空数据占位 */
function EmptyBlock() {
  return <p className="py-8 text-center text-sm text-[var(--text-muted)]">暂无数据</p>;
}

/** 区块标题 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono-heading text-base font-bold text-[var(--text-primary)]">
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------------

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingImg, setSavingImg] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/history/stats');
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? '获取统计失败');
      setData(json.data as StatsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  /** 保存统计页为图片 + 复制到剪贴板 */
  const handleSaveImage = useCallback(async () => {
    if (!contentRef.current) return;
    setSavingImg(true);
    setSaveSuccess(false);
    try {
      // 动态导入 html2canvas
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#0D1117',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // 原生平台：调起系统分享
      if (isNative()) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const { Share } = await import('@capacitor/share');
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            // 先写入临时文件
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const fileName = `bambu_stats_${Date.now()}.png`;
            const writeResult = await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.Cache,
            });
            // 调起系统分享
            await Share.share({
              title: 'Bambu Lab 打印统计',
              text: '我的 3D 打印统计数据',
              url: writeResult.uri,
              dialogTitle: '分享打印统计',
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
            return;
          }
        } catch (e: any) {
          // 用户取消分享不报错
          if (e?.message?.includes('cancel')) return;
          // 分享失败，回退到普通保存
        }
      }

      // Web/Electron：保存到本地 + 复制到剪贴板
      const link = document.createElement('a');
      link.download = `bambu_stats_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 复制到剪贴板
      try {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        }
      } catch {
        // 剪贴板复制失败不影响保存
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error('保存图片失败:', e);
    } finally {
      setSavingImg(false);
    }
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-[var(--danger)]">{error}</p>
        <button onClick={fetchStats} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] hover:opacity-90">
          重试
        </button>
      </div>
    );
  }

  const life = data!.stats_lifetime;
  const s7 = data!.stats_7d;
  const s30 = data!.stats_30d;

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="font-mono-heading text-xl font-bold text-[var(--text-primary)]">分析统计</h1>
        <div className="flex items-center gap-2">
          {/* 保存/分享按钮 */}
          <button
            onClick={handleSaveImage}
            disabled={savingImg}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            {saveSuccess ? <CheckCircle2 size={14} className="text-[#00E676]" /> : isNative() ? <Share2 size={14} /> : <Camera size={14} />}
            {saveSuccess ? '已保存' : savingImg ? '处理中...' : isNative() ? '分享图片' : '保存图片'}
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* 可截图区域 */}
      <div ref={contentRef} className="space-y-6">
        {/* 统计卡片网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatsCard icon={<Printer size={18} />} value={life.total_prints} label="总打印次数" />
          <StatsCard icon={<TrendingUp size={18} />} value={`${life.success_rate}%`} label="成功率" />
          <StatsCard icon={<Package size={18} />} value={formatWeight(life.total_weight_g)} label="总耗材" />
          <StatsCard icon={<Clock size={18} />} value={fmtHours(life.total_duration_hours)} label="总时长" />
          <StatsCard icon={<Monitor size={18} />} value={Object.keys(life.devices).length} label="设备数" />
          <StatsCard icon={<Palette size={18} />} value={Object.keys(life.filaments).length} label="耗材类型" />
        </div>

        {/* 周期对比表 */}
        <section>
          <SectionTitle>周期对比</SectionTitle>
          <PeriodTable s7={s7} s30={s30} life={life} />
        </section>

        {/* 设备分布 */}
        <section>
          <SectionTitle>设备分布</SectionTitle>
          <DeviceDistribution devices={life.devices} />
        </section>

        {/* 耗材统计 */}
        <section>
          <SectionTitle>耗材统计</SectionTitle>
          <FilamentTable data={data!.filament_success_stats} />
        </section>

        {/* 月度趋势图 */}
        <section>
          <SectionTitle>月度趋势</SectionTitle>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <MonthlyChart monthly={life.monthly} />
          </div>
        </section>

        {/* 活动热力图 */}
        <section>
          <SectionTitle>活动热力图</SectionTitle>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 overflow-x-auto">
            <ActivityHeatmap heatmap={data!.activity_heatmap} />
          </div>
        </section>

        {/* 新增分析项：喷嘴尺寸 + 切片模式 + 占比指标 */}
        <section>
          <SectionTitle>打印参数分析</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">喷嘴尺寸分布</h3>
              <NozzleSizeChart dist={life.nozzle_size_distribution} />
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">切片模式分布</h3>
              <SliceModeChart dist={life.slice_mode_distribution} />
            </div>
          </div>
        </section>

        {/* 占比指标：超500g + 多色模型 */}
        <section>
          <SectionTitle>模型特征占比</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RateCard label="超500g模型占比" count={life.over_500g_count} rate={life.over_500g_rate} total={life.total_prints} />
            <RateCard label="多色模型占比" count={life.multi_color_count} rate={life.multi_color_rate} total={life.total_prints} />
          </div>
        </section>

        {/* 颜色使用量对比 */}
        <section>
          <SectionTitle>颜色使用量对比</SectionTitle>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <ColorUsageChart data={data!.color_usage_stats} />
          </div>
        </section>

        {/* 时长分布 */}
        <section>
          <SectionTitle>时长分布</SectionTitle>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <DurationDistribution dist={life.duration_distribution} />
          </div>
        </section>

        {/* 之最统计 */}
        <section>
          <SectionTitle>之最统计</SectionTitle>
          <ExtremesCard extremes={life.extremes} />
        </section>
      </div>
    </div>
  );
}
