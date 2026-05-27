import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  DownloadCloud,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import CoverImage from '@/components/CoverImage';
import DetailModal from '@/components/DetailModal';
import { formatDateTime, formatDuration, formatWeight } from '@/utils/format';
import { extractFilamentInfo } from '@/utils/history-helpers';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import type { BambuHistoryItem } from '@/types/bambu';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

type HistoryRecord = BambuHistoryItem;

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
      // 构建筛选参数
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (deviceFilter) filters.device = deviceFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (search) filters.search = search;

      const json = await api.getHistory(page, pageSize, filters);

      if (json.success && json.data) {
        setRecords(json.data.data as HistoryRecord[] ?? []);
        setTotal(json.data.total ?? 0);
      }

      // 更新设备列表
      if (json.devices) {
        setDevices(json.devices);
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

  // 首次加载时，如果缓存为空，自动触发全量下载
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  useEffect(() => {
    if (initialFetchDone) return;
    setInitialFetchDone(true);

    const timer = setTimeout(async () => {
      try {
        // 检查缓存是否为空
        const checkResult = await api.getHistory(1, 1);
        if (checkResult.success && checkResult.data && checkResult.data.total === 0) {
          // 自动触发全量下载
          const dlResult = await api.fullDownload();
          if (dlResult.success) {
            showToast(`首次下载完成，共 ${dlResult.data?.total ?? 0} 条`, 'ok');
            fetchHistory();
          }
        }
      } catch { /* 静默失败 */ }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 增量更新 ----
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const json = await api.refreshHistory();
      if (json.success) {
        const added = json.data?.added ?? 0;
        const totalMsg = json.data?.total ?? '';
        showToast(added > 0 ? `新增 ${added} 条记录，共 ${totalMsg} 条` : '没有新记录', 'ok');
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
      const json = await api.fullDownload();
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

  /** 重置所有筛选条件 */
  const handleResetFilters = useCallback(() => {
    setStatusFilter('');
    setDeviceFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  }, []);

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

        {/* 确定和重置按钮 */}
        <button
          onClick={() => fetchHistory()}
          className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          确定
        </button>
        <button
          onClick={handleResetFilters}
          className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          重置
        </button>
      </div>

      {/* ===== 记录表格 ===== */}
      <div className="flex-1 overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="h-full overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
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
