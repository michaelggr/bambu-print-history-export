﻿import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, Info, ExternalLink, Loader2, RefreshCw, Download, MessageCircle } from 'lucide-react';
import useAppStore from '@/store';
import { api } from '@/utils/api';

/** 当前版本号 */
const APP_VERSION = '2.2.0';
/** GitHub 仓库 */
const GITHUB_REPO = 'michaelggr/bambu-print-history-export';
/** QQ 交流群链接 */
const QQ_GROUP_URL = 'https://qm.qq.com/q/9paJFuZbCE';

/** 设置项类型 */
interface SettingsData {
  cacheCount: number;
}

export default function Settings() {
  const navigate = useNavigate();
  const clearAuth = useAppStore((s) => s.clearAuth);

  const [settings, setSettings] = useState<SettingsData>({ cacheCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; latest: string; notes: string; downloadUrl: string } | null>(null);

  /** 获取设置 */
  const fetchSettings = useCallback(async () => {
    try {
      const json = await api.getSettings();
      if (json.success !== false) {
        const d = json.data ?? json;
        setSettings({ cacheCount: d.cacheCount ?? 0 });
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /** 清除缓存 */
  const handleClearCache = useCallback(async () => {
    if (!window.confirm('确定要清除缓存数据吗？此操作不可撤销。')) return;
    try {
      const data = await api.clearCache();
      if (data.success) {
        setSettings((prev) => ({ ...prev, cacheCount: 0 }));
      } else {
        setError('清除缓存失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  }, []);

  /** 清除全部数据 */
  const handleClearAll = useCallback(async () => {
    if (!window.confirm('确定要清除全部数据吗？此操作将删除所有历史记录和缓存，且不可撤销！')) return;
    try {
      const data = await api.clearAll();
      if (data.success) {
        clearAuth();
        navigate('/login', { replace: true });
      } else {
        setError('清除数据失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  }, [clearAuth, navigate]);

  /** 登出 */
  const handleLogout = useCallback(async () => {
    try { await api.logout(); } catch { /* 忽略 */ }
    clearAuth();
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  /** 检查更新 */
  const handleCheckUpdate = useCallback(async () => {
    setUpdateChecking(true);
    setUpdateInfo(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!res.ok) throw new Error('无法获取版本信息');
      const data = await res.json();
      const latest = data.tag_name?.replace(/^v/, '') || '';
      const hasUpdate = latest && latest !== APP_VERSION && latest > APP_VERSION;
      setUpdateInfo({
        hasUpdate,
        latest,
        notes: data.body || '暂无更新说明',
        downloadUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      });
    } catch {
      setUpdateInfo({ hasUpdate: false, latest: APP_VERSION, notes: '检查更新失败，请稍后重试', downloadUrl: '' });
    } finally {
      setUpdateChecking(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">系统设置</h1>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {/* 数据管理 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">数据管理</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">缓存记录数</p>
            <p className="text-xs text-[var(--text-secondary)]">当前缓存的历史记录数量</p>
          </div>
          <span className="font-mono-heading text-lg font-bold text-[var(--accent)]">{settings.cacheCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">清除缓存</p>
            <p className="text-xs text-[var(--text-secondary)]">清除本地缓存数据</p>
          </div>
          <button onClick={handleClearCache} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/20 disabled:opacity-50">
            <Trash2 size={14} />清除
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">清除全部数据</p>
            <p className="text-xs text-[var(--text-secondary)]">删除所有数据并退出登录</p>
          </div>
          <button onClick={handleClearAll} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/20 disabled:opacity-50">
            <Trash2 size={14} />全部清除
          </button>
        </div>
      </section>

      {/* 账号信息 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">账号信息</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">当前账号</p>
            <p className="text-xs text-[var(--text-secondary)]">已登录</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
            <LogOut size={14} />登出
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">关于</h2>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Info size={14} />
          <span>Bambu Lab 打印历史导出工具</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">版本 {APP_VERSION}</p>
          <button onClick={handleCheckUpdate} disabled={updateChecking}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50">
            {updateChecking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {updateChecking ? '检查中...' : '检查更新'}
          </button>
        </div>
        {updateInfo && (
          <div className="rounded-lg bg-[var(--bg-primary)] p-3 text-xs space-y-2">
            {updateInfo.hasUpdate ? (
              <>
                <p className="text-[var(--accent)]">发现新版本 v{updateInfo.latest}</p>
                <p className="text-[var(--text-secondary)]">{updateInfo.notes}</p>
                <a href={updateInfo.downloadUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--bg-primary)] hover:opacity-90">
                  <Download size={12} />下载更新
                </a>
              </>
            ) : (
              <p className="text-[var(--text-secondary)]">已是最新版本</p>
            )}
          </div>
        )}
        {/* 链接区 */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:underline">
            <ExternalLink size={14} />GitHub
          </a>
          <a href="https://github.com/michaelggr/ha-printer-analytics" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:underline">
            <ExternalLink size={14} />Printer Analytics (HACS)
          </a>
          <a href={QQ_GROUP_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:underline">
            <MessageCircle size={14} />QQ 交流群
          </a>
        </div>
      </section>
    </div>
  );
}
