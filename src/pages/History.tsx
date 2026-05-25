﻿import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  DownloadCloud,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Box,
  Loader2,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatDuration, formatWeight, rgbaToHex } from '@/utils/format';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// 类型定义 — 对齐后端 BambuHistoryItem
// ---------------------------------------------------------------------------

interface AmsDetail {
  filamentType: string;
  sourceColor: string;
  weight: number;
  length: number;
}

interface HistoryRecord {
  id: string;
  designId?: number | string;
  designTitle?: string;
  title?: string;
  status: number;
  deviceName?: string;
  deviceModel?: string;
  deviceId?: string;
  startTime?: string;
  endTime?: string;
  costTime?: number;
  weight?: number;
  length?: number;
  cover?: string;
  snapShot?: string;
  filamentType?: string;
  filamentColor?: string;
  amsDetailMapping?: AmsDetail[];
  mode?: string;
  bedType?: string;
  useAms?: boolean;
  nozzleSize?: string | number;
  nozzleInfos?: Array<{ diameter: number; type: string }>;
  progress?: number;
}

interface HistoryResponse {
  success: boolean;
  data: {
    data: HistoryRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface ActionResponse {
  success: boolean;
  data?: { added?: number; total?: number; message?: string };
  error?: string;
}

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '2', label: '成功' },
  { value: '3', label: '失败' },
  { value: '1,4', label: '取消' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/** 提取耗材信息（取第一个 AMS 耗材） */
function extractFilamentInfo(record: HistoryRecord): { type: string; color: string } {
  const amsList = record.amsDetailMapping;
  if (Array.isArray(amsList) && amsList.length > 0) {
    const first = amsList[0];
    return {
      type: first?.filamentType ?? record.filamentType ?? '',
      color: first?.sourceColor ? rgbaToHex(first.sourceColor) : (record.filamentColor ? rgbaToHex(record.filamentColor) : ''),
    };
  }
  return {
    type: record.filamentType ?? '',
    color: record.filamentColor ? rgbaToHex(record.filamentColor) : '',
  };
}

/** 格式化长度（mm → m） */
function formatLength(mm: number): string {
  if (!mm || mm <= 0) return '-';
  const m = mm / 1000;
  return `${m.toFixed(1)}m`;
}

/** 切片模式映射 */
function sliceModeLabel(mode?: string): string {
  if (!mode) return '-';
  if (mode === 'cloud_slice') return '云端';
  if (mode === 'local') return '本地';
  return mode;
}

// ---------------------------------------------------------------------------
// 组件：封面缩略图
// ---------------------------------------------------------------------------

function CoverImage({ src, alt, size = 40 }: { src?: string; alt: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div
        className="flex items-center justify-center rounded bg-[var(--bg-tertiary)]"
        style={{ width: size, height: size }}
      >
        <Box size={size * 0.45} className="text-[var(--text-muted)]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="rounded object-cover"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}

// ---------------------------------------------------------------------------
// 组件：详情弹窗
// ---------------------------------------------------------------------------

function DetailModal({
  record,
  onClose,
}: {
  record: HistoryRecord;
  onClose: () => void;
}) {
  const [snapError, setSnapError] = useState(false);
  const title = record.designTitle ?? record.title ?? '未命名';

  // 提取字段
  const filament = extractFilamentInfo(record);
  const nozzleSize = record.nozzleSize ? `${record.nozzleSize}mm`
    : (Array.isArray(record.nozzleInfos) && record.nozzleInfos.length > 0 && record.nozzleInfos[0].diameter
      ? `${record.nozzleInfos[0].diameter}mm` : '-');
  const nozzleType = Array.isArray(record.nozzleInfos) && record.nozzleInfos.length > 0
    ? (record.nozzleInfos[0].type || '-') : '-';
  const bedType = record.bedType ?? '-';
  const sliceMode = sliceModeLabel(record.mode);
  const useAms = record.useAms ? '是' : '否';
  const serial = record.deviceId ?? '-';

  // 模型链接 — 使用 designId
  const modelUrl = record.designId
    ? `https://makerworld.com.cn/zh/models/${record.designId}`
    : '';

  // 计算总重量和长度
  let totalWeight = 0;
  let totalLength = 0;
  if (Array.isArray(record.amsDetailMapping)) {
    for (const ams of record.amsDetailMapping) {
      totalWeight += Number(ams.weight ?? 0) || 0;
      totalLength += Number(ams.length ?? 0) || 0;
    }
  }
  if (totalWeight === 0) totalWeight = Number(record.weight ?? 0) || 0;
  if (totalLength === 0) totalLength = Number(record.length ?? 0) || 0;

  /** 字段行 */
  function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex gap-3 py-1.5">
        <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{label}</span>
        <span className="text-sm text-[var(--text-primary)]">{children}</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 弹窗主体 */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题 + 关闭 */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* 图片 + 字段 */}
        <div className="flex gap-6">
          {/* 左侧图片 */}
          <div className="flex shrink-0 flex-col gap-3">
            <CoverImage src={record.cover} alt={title} size={200} />
            {record.snapShot && !snapError && (
              <img
                src={record.snapShot}
                alt="快照"
                className="max-w-[200px] rounded object-contain"
                onError={() => setSnapError(true)}
              />
            )}
          </div>

          {/* 右侧字段 */}
          <div className="flex-1">
            <FieldRow label="任务名称">{title}</FieldRow>
            <FieldRow label="状态"><StatusBadge status={record.status} /></FieldRow>
            <FieldRow label="设备">
              {record.deviceName ?? '-'}
              {record.deviceModel ? ` (${record.deviceModel})` : ''}
            </FieldRow>
            <FieldRow label="开始时间">{formatDateTime(record.startTime ?? '')}</FieldRow>
            <FieldRow label="结束时间">{formatDateTime(record.endTime ?? '')}</FieldRow>
            <FieldRow label="打印时长">{formatDuration(record.costTime ?? 0)}</FieldRow>
            <FieldRow label="耗材重量">{formatWeight(totalWeight)}</FieldRow>
            <FieldRow label="耗材长度">{formatLength(totalLength)}</FieldRow>
            <FieldRow label="喷嘴直径">{nozzleSize}</FieldRow>
            <FieldRow label="喷嘴类型">{nozzleType}</FieldRow>
            <FieldRow label="热床类型">{bedType}</FieldRow>
            <FieldRow label="切片模式">{sliceMode}</FieldRow>
            <FieldRow label="使用AMS">{useAms}</FieldRow>
            <FieldRow label="设备序列号">{serial}</FieldRow>
            <FieldRow label="多色打印">
              {Array.isArray(record.amsDetailMapping) && record.amsDetailMapping.length > 1 ? '是' : '否'}
            </FieldRow>
            {modelUrl && (
              <FieldRow label="模型链接">
                <a
                  href={modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4FC3F7] underline"
                >
                  {modelUrl}
                </a>
              </FieldRow>
            )}

            {/* AMS 耗材详情 */}
            {Array.isArray(record.amsDetailMapping) && record.amsDetailMapping.length > 0 && (
              <>
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">AMS 耗材详情</span>
                </div>
                {record.amsDetailMapping.map((ams, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-sm">
                    <span className="text-[var(--text-secondary)]">AMS#{i + 1}:</span>
                    <span className="text-[var(--text-primary)]">{ams.filamentType}</span>
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: rgbaToHex(ams.sourceColor) }}
                    />
                    <span className="text-[var(--text-primary)]">{formatWeight(ams.weight)}</span>
                    <span className="text-[var(--text-primary)]">{formatLength(ams.length)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------------

export default function History() {
  // 列表数据
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // 设备列表（从数据中动态提取）
  const [devices, setDevices] = useState<string[]>([]);

  // 操作按钮 loading
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 选中行 & 详情弹窗
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<HistoryRecord | null>(null);

  // 提示消息
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // ---- 获取历史列表 ----
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (deviceFilter) params.set('device', deviceFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/history?${params}`);
      const json = (await res.json()) as HistoryResponse;

      if (json.success && json.data) {
        setRecords(json.data.data ?? []);
        setTotal(json.data.total ?? 0);

        // 从记录中提取设备列表
        const deviceSet = new Set<string>();
        for (const r of json.data.data ?? []) {
          if (r.deviceName) deviceSet.add(r.deviceName);
        }
        // 合并已有设备列表（避免翻页后丢失）
        setDevices((prev) => {
          const merged = new Set([...prev, ...deviceSet]);
          return Array.from(merged).sort();
        });
      }
    } catch {
      showToast('获取历史记录失败', 'err');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, deviceFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ---- 增量更新 ----
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/history/refresh', { method: 'POST' });
      const json = (await res.json()) as ActionResponse;
      if (json.success) {
        const added = json.data?.added ?? 0;
        const totalMsg = json.data?.total ?? '';
        showToast(added > 0 ? `新增 ${added} 条记录，共 ${totalMsg} 条` : (json.data?.message ?? '没有新记录'), 'ok');
        fetchHistory();
      } else {
        showToast(json.error ?? '增量更新失败', 'err');
      }
    } catch {
      showToast('网络错误', 'err');
    } finally {
      setRefreshing(false);
    }
  };

  // ---- 全量下载 ----
  const handleFullDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/history/full-download', { method: 'POST' });
      const json = (await res.json()) as ActionResponse;
      if (json.success) {
        showToast(`全量下载完成，共 ${json.data?.total ?? 0} 条`, 'ok');
        fetchHistory();
      } else {
        showToast(json.error ?? '全量下载失败', 'err');
      }
    } catch {
      showToast('网络错误', 'err');
    } finally {
      setDownloading(false);
    }
  };

  // ---- 提示消息 ----
  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ---- 分页计算 ----
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  // ---- 筛选变化时重置页码 ----
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  // ---- 公共 select 样式 ----
  const selectCls =
    'rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]';

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ===== 顶部操作栏 ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono-heading text-xl font-bold text-[var(--text-primary)]">
            打印历史
          </h1>
          <span className="rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
            {total} 条
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md border border-[var(--accent)]/40 bg-transparent px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {refreshing ? '更新中...' : '增量更新'}
          </button>
          <button
            onClick={handleFullDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-md border border-[var(--accent)]/40 bg-transparent px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
            {downloading ? '下载中...' : '全量下载'}
          </button>
        </div>
      </div>

      {/* ===== 筛选栏 ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-secondary)] p-3">
        {/* 状态筛选 */}
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          className={selectCls}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* 设备筛选 */}
        <select
          value={deviceFilter}
          onChange={(e) => handleFilterChange(setDeviceFilter)(e.target.value)}
          className={selectCls}
        >
          <option value="">全部设备</option>
          {devices.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* 日期范围 */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
          className={cn(selectCls, 'w-[140px]')}
        />
        <span className="text-sm text-[var(--text-muted)]">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
          className={cn(selectCls, 'w-[140px]')}
        />

        {/* 关键词搜索 */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="搜索任务名称"
            value={search}
            onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
            className={cn(selectCls, 'w-[180px] pl-8')}
          />
        </div>
      </div>

      {/* ===== 记录表格 ===== */}
      <div className="flex-1 overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="h-full overflow-auto">
          <table className="w-full border-collapse text-sm">
            {/* 表头 */}
            <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)]">
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="w-[50px] px-3 py-2.5 font-medium">#</th>
                <th className="w-[60px] px-2 py-2.5 font-medium">封面</th>
                <th className="px-3 py-2.5 font-medium">名称</th>
                <th className="w-[80px] px-3 py-2.5 font-medium">状态</th>
                <th className="w-[100px] px-3 py-2.5 font-medium">设备</th>
                <th className="w-[100px] px-3 py-2.5 font-medium">耗材</th>
                <th className="w-[80px] px-3 py-2.5 font-medium">重量</th>
                <th className="w-[100px] px-3 py-2.5 font-medium">时长</th>
                <th className="w-[140px] px-3 py-2.5 font-medium">时间</th>
              </tr>
            </thead>

            {/* 表体 */}
            <tbody>
              {loading ? (
                // 骨架屏
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-4 animate-pulse rounded bg-[var(--bg-tertiary)]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[var(--text-muted)]">
                    暂无记录
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => {
                  const filament = extractFilamentInfo(r);
                  const isSelected = selectedId === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      onDoubleClick={() => setDetailRecord(r)}
                      className={cn(
                        'cursor-pointer border-t border-[var(--border)] transition-colors',
                        isSelected
                          ? 'border-l-2 border-l-[var(--accent)] bg-[var(--accent)]/5'
                          : 'hover:bg-[var(--bg-tertiary)]/50',
                      )}
                    >
                      <td className="px-3 py-2 text-[var(--text-muted)]">
                        {startIdx + idx}
                      </td>
                      <td className="px-2 py-2">
                        <CoverImage src={r.cover} alt={r.designTitle ?? r.title ?? ''} />
                      </td>
                      <td className="max-w-[300px] truncate px-3 py-2 text-[var(--text-primary)]">
                        {r.designTitle ?? r.title ?? '-'}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {r.deviceName ?? '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {filament.color && (
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                              style={{ backgroundColor: filament.color }}
                            />
                          )}
                          <span className="truncate text-[var(--text-secondary)]">
                            {filament.type || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {formatWeight(r.weight ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {formatDuration(r.costTime ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {formatDateTime(r.startTime ?? '')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 分页器 ===== */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">
          第 {total > 0 ? startIdx : 0}-{endIdx} 条，共 {total} 条
        </span>

        <div className="flex items-center gap-2">
          {/* 每页条数 */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className={selectCls}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} 条/页</option>
            ))}
          </select>

          {/* 翻页 */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[60px] text-center text-sm text-[var(--text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ===== 详情弹窗 ===== */}
      {detailRecord && (
        <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}

      {/* ===== Toast 提示 ===== */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-opacity',
            toast.type === 'ok'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'bg-[var(--danger)] text-white',
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
