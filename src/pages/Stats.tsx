import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Printer, TrendingUp, Package, Clock, Monitor, Palette,
  RefreshCw, Camera, CheckCircle2, Share2,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { formatWeight } from '@/utils/format';
import { api } from '@/utils/api';
import { isNative } from '@/utils/platform';
import type { StatsResult } from '@/types/bambu';

// 子组件导入
import PeriodTable from '@/components/stats/PeriodTable';
import DeviceDistribution from '@/components/stats/DeviceDistribution';
import FilamentTable from '@/components/stats/FilamentTable';
import MonthlyChart from '@/components/stats/MonthlyChart';
import ActivityHeatmap from '@/components/stats/ActivityHeatmap';
import DurationDistribution from '@/components/stats/DurationDistribution';
import ExtremesCard from '@/components/stats/ExtremesCard';
import NozzleSizeChart from '@/components/stats/NozzleSizeChart';
import SliceModeChart from '@/components/stats/SliceModeChart';
import RateCard from '@/components/stats/RateCard';
import ColorUsageChart from '@/components/stats/ColorUsageChart';
import { SectionTitle } from '@/components/stats/shared';

// ---------------------------------------------------------------------------
// 类型定义 — 使用共享类型
// ---------------------------------------------------------------------------

type StatsData = StatsResult;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 格式化小时数 */
function fmtHours(h: number): string {
  if (!h || h <= 0) return '-';
  if (h >= 24) return `${(h / 24).toFixed(1)}天`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.round(h * 60)}m`;
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
      const json = await api.getStats();
      if (json.success && json.data) {
        setData(json.data as unknown as StatsData);
      } else {
        throw new Error(json.error ?? '获取统计失败');
      }
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
      // 截图前临时固定宽度，确保手机端内容不溢出
      const el = contentRef.current;
      const originalWidth = el.style.width;
      el.style.width = '800px';
      const canvas = await html2canvas(el, {
        backgroundColor: '#0D1117',
        scale: 2,
        useCORS: true,
        logging: false,
        width: 800,
        windowWidth: 800,
      });
      // 恢复原始宽度
      el.style.width = originalWidth;

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
        } catch (e: unknown) {
          // 用户取消分享不报错
          const msg = e instanceof Error ? e.message : '';
          if (msg.includes('cancel')) return;
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

        {/* 打印参数分析 */}
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

        {/* 模型特征占比 */}
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
