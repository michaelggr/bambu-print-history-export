import { useState, useCallback, useEffect } from 'react';
import { FileJson, FileSpreadsheet, Plug, Download, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import { isNative } from '@/utils/platform';

/** 导出格式 */
type ExportFormat = 'json' | 'csv' | 'ha';

/** 格式选项配置 */
const FORMAT_OPTIONS: {
  value: ExportFormat;
  icon: typeof FileJson;
  label: string;
  desc: string;
}[] = [
  { value: 'json', icon: FileJson, label: 'JSON', desc: '原始 Bambu Cloud 数据格式' },
  { value: 'csv', icon: FileSpreadsheet, label: 'CSV', desc: '通用表格格式，兼容 Excel' },
  { value: 'ha', icon: Plug, label: 'HA 插件', desc: 'Home Assistant 打印分析插件导入格式' },
];

/** HA 格式包含的字段列表（对齐 v3 完整字段） */
const HA_FIELDS = [
  'task_name', 'status', 'design_id', 'printer_serial',
  'start_time', 'end_time', 'duration_hours', 'prepare_time_minutes',
  'filament_type', 'filament_color', 'total_weight', 'total_length',
  'colors_used', 'types_used', 'total_colors', 'multi_color', 'over_500g', 'color_usage',
  'energy_kwh',
  'nozzle_type', 'nozzle_size', 'print_bed_type', 'speed_profile', 'slice_mode', 'ams_used', 'total_layer_count',
  'progress',
  'cover_image_url',
];

/** 状态筛选选项 — 对齐 Bambu 状态码：2=成功, 3=失败, 1/4=取消 */
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: '2', label: '成功' },
  { value: '3', label: '失败' },
  { value: '1,4', label: '取消' },
];

/** 获取今日日期字符串（用于文件名） */
function getTodayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export default function Export() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // 获取总记录数
  useEffect(() => {
    api.getHistory(1, 1)
      .then((json) => {
        if (json.success && json.data) setTotalCount(json.data.total ?? 0);
      })
      .catch(() => {});
  }, []);

  /** 触发下载（Web 用 <a>，安卓端用 Filesystem+Share） */
  const triggerDownload = useCallback(async (blob: Blob, ext: string) => {
    if (isNative()) {
      // 安卓端：使用 Capacitor Filesystem 写文件 + Share 分享
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        const fileName = `bambu_history_${getTodayStr()}.${ext}`;
        const text = await blob.text();

        // 写入应用缓存目录
        await Filesystem.writeFile({
          path: fileName,
          data: text,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // 获取文件 URI 用于分享
        const fileUri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

        // 调起系统分享
        await Share.share({
          title: 'Bambu 打印历史',
          text: `导出 ${totalCount} 条记录`,
          url: fileUri.uri,
          dialogTitle: '分享导出文件',
        });
      } catch (shareErr) {
        // Share 失败时降级为剪贴板
        console.warn('Share failed, fallback to clipboard:', shareErr);
        const text = await blob.text();
        if (text.length > 180 * 1024) {
          setError(`数据较大（${(text.length / 1024).toFixed(0)}KB），请通过电脑端导出`);
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          setError('数据已复制到剪贴板');
          setTimeout(() => setError(''), 4000);
        } catch {
          setError('导出失败，请检查权限');
        }
      }
      return;
    }

    // Web 端：标准 <a> 下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bambu_history_${getTodayStr()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [totalCount]);

  /** 执行导出 */
  const handleExport = useCallback(async () => {
    setError('');
    setExporting(true);

    try {
      // 构建筛选参数
      const filters: Record<string, string> = {};
      if (status) filters.status = status;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      // 调用统一 API 获取导出数据
      const result = await api.exportData(format, filters);

      if (!result.success) {
        setError(result.error ?? '导出失败');
        return;
      }

      // 根据格式生成 Blob 并触发下载
      const ext = format === 'csv' ? 'csv' : 'json';
      let content: string;

      if (format === 'csv') {
        // CSV 格式：data 是含 BOM 头的 CSV 字符串
        content = result.data as string;
      } else if (format === 'ha') {
        // HA 格式：data 是 HAFormat 对象
        content = JSON.stringify(result.data, null, 2);
      } else {
        // JSON 格式：data 是原始记录数组
        content = JSON.stringify(result.data, null, 2);
      }

      const mimeType = format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/json';
      const blob = new Blob([content], { type: mimeType });
      triggerDownload(blob, ext);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setExporting(false);
    }
  }, [format, status, dateFrom, dateTo, triggerDownload]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 标题 */}
      <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">
        数据导出
      </h1>

      {/* 格式选择卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FORMAT_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
          <button
            key={value}
            onClick={() => setFormat(value)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border p-5 transition-colors',
              format === value
                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]',
            )}
          >
            <Icon
              size={28}
              className={cn(
                'transition-colors',
                format === value ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              )}
            />
            <span
              className={cn(
                'font-mono-heading text-sm font-bold',
                format === value ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]',
              )}
            >
              {label}
            </span>
            <span className="text-xs text-[var(--text-secondary)] text-center leading-snug">
              {desc}
            </span>
          </button>
        ))}
      </div>

      {/* 导出选项 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          筛选条件（可选）
        </h2>

        <div className="flex flex-wrap items-end gap-4">
          {/* 状态筛选 */}
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* 日期范围 */}
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">开始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">结束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* HA 格式说明 */}
        {format === 'ha' && (
          <div className="rounded-lg bg-[var(--bg-primary)] p-4 text-xs text-[var(--text-secondary)] leading-relaxed">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[var(--text-primary)] font-medium">
                导出格式兼容 HA printer_analytics 插件，可直接通过服务调用导入。
              </p>
              <a
                href="https://github.com/michaelggr/ha-printer-analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline shrink-0 ml-3"
              >
                <ExternalLink size={12} />
                HACS 安装
              </a>
            </div>
            <p>包含字段：</p>
            <p className="mt-1 font-mono-heading text-[var(--accent)]/80 break-all">
              {HA_FIELDS.join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* 导出预览 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          导出预览
        </h2>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[var(--text-secondary)]">记录数：</span>
            <span className="font-mono-heading font-bold text-[var(--text-primary)]">
              {totalCount}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">格式：</span>
            <span className="font-mono-heading font-bold text-[var(--accent)]">
              {FORMAT_OPTIONS.find((o) => o.value === format)?.label}
            </span>
          </div>
        </div>
        {format === 'ha' && (
          <div className="text-xs text-[var(--text-muted)]">
            共 {HA_FIELDS.length} 个字段将被导出
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}

      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={exporting || totalCount === 0}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-colors',
          exporting || totalCount === 0
            ? 'cursor-not-allowed bg-[var(--accent)]/40 text-[var(--bg-primary)]/60'
            : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-dim)]',
        )}
      >
        {exporting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        {exporting ? '导出中...' : '导出数据'}
      </button>
    </div>
  );
}
