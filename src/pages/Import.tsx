import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Plug,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseImportFile,
  importMerge,
  importOverwrite,
  type ImportFormat,
  type ImportResult,
} from '@/utils/bambu-import';
import * as bambuCache from '@/utils/bambu-cache';

/** 导入模式 */
type ImportMode = 'merge' | 'overwrite';

/** 支持的文件扩展名 */
const ACCEPTED_EXTENSIONS = '.json,.csv,.ha';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added?: number; skipped?: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- 文件处理 ----
  const handleFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParseResult(null);
    setResult(null);
    setError('');

    // 自动解析
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseImportFile(text);
      setParseResult(parsed);
      setParsing(false);
    };
    reader.onerror = () => {
      setError('文件读取失败');
      setParsing(false);
    };
    reader.readAsText(selectedFile);
  }, []);

  // ---- 拖拽处理 ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  // ---- 执行导入 ----
  const handleImport = useCallback(async () => {
    if (!parseResult?.success || !file) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      if (mode === 'merge') {
        const res = importMerge(parseResult.data);
        setResult({ added: res.added, skipped: res.skipped, total: res.total });
      } else {
        const res = importOverwrite(parseResult.data);
        setResult({ total: res.total });
      }
    } catch (e) {
      setError(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setImporting(false);
    }
  }, [parseResult, file, mode]);

  // ---- 重置 ----
  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- 格式图标 ----
  const formatIcon = (format: ImportFormat) => {
    switch (format) {
      case 'json': return <FileJson size={18} />;
      case 'csv': return <FileSpreadsheet size={18} />;
      case 'ha': return <Plug size={18} />;
    }
  };

  const formatLabel = (format: ImportFormat) => {
    switch (format) {
      case 'json': return 'JSON（原始数据）';
      case 'csv': return 'CSV（表格格式）';
      case 'ha': return 'HA（Printer Analytics）';
    }
  };

  // 预览统计
  const previewCount = parseResult?.success ? parseResult.data.length : 0;
  const existingCount = bambuCache.loadHistoryCache().length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 标题 */}
      <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">数据导入</h1>

      {/* 文件选择区 */}
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          dragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : file
              ? 'border-[var(--accent)]/40 bg-[var(--bg-secondary)]'
              : 'border-[var(--border)] hover:border-[var(--text-muted)]',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {parsing ? (
          <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        ) : file ? (
          <div className="flex items-center gap-3">
            <FileUp size={24} className="text-[var(--accent)]" />
            <div className="text-left">
              <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        ) : (
          <>
            <Upload size={32} className="mb-2 text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">点击选择或拖拽文件到此处</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">支持 .json / .csv / .ha 格式</p>
          </>
        )}
      </div>

      {/* 解析结果 */}
      {parseResult && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
          {parseResult.success ? (
            <>
              {/* 格式信息 */}
              <div className="flex items-center gap-2">
                {formatIcon(parseResult.format)}
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  检测到 {formatLabel(parseResult.format)}
                </span>
                <CheckCircle2 size={16} className="text-green-500" />
              </div>

              <p className="text-sm text-[var(--text-secondary)]">
                包含 <strong className="text-[var(--text-primary)]">{previewCount}</strong> 条记录
                {existingCount > 0 && `，当前缓存已有 ${existingCount} 条`}
              </p>

              {/* 导入模式选择 */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--text-primary)]">选择导入方式：</p>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    mode === 'merge'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)]',
                  )}
                >
                  <input
                    type="radio"
                    value="merge"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">增量合并（推荐）</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      按 ID 去重，新记录追加，已存在则跳过
                      {previewCount > 0 && existingCount > 0 && `（预计新增约 ${Math.max(0, previewCount - existingCount)} 条）`}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    mode === 'overwrite'
                      ? 'border-[var(--danger)] bg-[var(--danger)]/5'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)]',
                  )}
                >
                  <input
                    type="radio"
                    value="overwrite"
                    checked={mode === 'overwrite'}
                    onChange={() => setMode('overwrite')}
                    className="mt-0.5 accent-[var(--danger)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">覆盖导入</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      清空现有数据，完全替换为导入的 {previewCount} 条记录
                    </p>
                  </div>
                </label>
              </div>

              {/* 覆盖警告 */}
              {mode === 'overwrite' && (
                <div className="flex items-start gap-2 rounded-md bg-[var(--danger)]/10 px-3 py-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                  <p className="text-xs text-[var(--danger)]">覆盖操作将清除当前所有历史数据，且不可撤销</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors',
                    importing
                      ? 'cursor-not-allowed bg-[var(--accent)]/40 text-[var(--bg-primary)]/60'
                      : mode === 'overwrite'
                        ? 'bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80'
                        : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-dim)]',
                  )}
                >
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {importing ? '导入中...' : '确认导入'}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <Trash2 size={14} /> 重新选择
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 text-[var(--danger)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm">{parseResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* 导入结果 */}
      {result && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="font-mono-heading text-sm font-bold text-green-600 dark:text-green-400">导入成功</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {mode === 'merge' ? (
              <>
                新增 <strong>{result.added}</strong> 条，
                跳过已存在 <strong>{result.skipped}</strong> 条，
                当前共 <strong>{result.total}</strong> 条记录
              </>
            ) : (
              <>已覆盖导入 <strong>{result.total}</strong> 条记录</>
            )}
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
