﻿import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, Info, ExternalLink, Loader2 } from 'lucide-react';
import useAppStore from '@/store';

/** 设置项类型 */
interface SettingsData {
  loggingEnabled: boolean;
  logLevel: string;
  cacheCount: number;
}

/** 日志级别选项 */
const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

export default function Settings() {
  const navigate = useNavigate();
  const token = useAppStore((s) => s.token);
  const clearAuth = useAppStore((s) => s.clearAuth);

  const [settings, setSettings] = useState<SettingsData>({
    loggingEnabled: false,
    logLevel: 'INFO',
    cacheCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /** 获取设置 */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success !== false) {
        setSettings({
          loggingEnabled: data.loggingEnabled ?? false,
          logLevel: data.logLevel ?? 'INFO',
          cacheCount: data.cacheCount ?? 0,
        });
      }
    } catch {
      // 静默处理，使用默认值
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /** 更新设置项 */
  const updateSetting = useCallback(async (patch: Partial<SettingsData>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.error || '更新失败');
        return;
      }
      // 更新本地状态
      setSettings((prev) => ({ ...prev, ...patch }));
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }, [token]);

  /** 清除缓存 */
  const handleClearCache = useCallback(async () => {
    if (!window.confirm('确定要清除缓存数据吗？此操作不可撤销。')) return;
    try {
      const res = await fetch('/api/settings/cache', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, cacheCount: 0 }));
      } else {
        setError(data.error || '清除缓存失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  }, [token]);

  /** 清除全部数据 */
  const handleClearAll = useCallback(async () => {
    if (!window.confirm('确定要清除全部数据吗？此操作将删除所有历史记录和缓存，且不可撤销！')) return;
    try {
      const res = await fetch('/api/settings/all', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        clearAuth();
        navigate('/login', { replace: true });
      } else {
        setError(data.error || '清除数据失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  }, [token, clearAuth, navigate]);

  /** 登出 */
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // 即使 API 失败也继续登出
    }
    clearAuth();
    navigate('/login', { replace: true });
  }, [token, clearAuth, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 标题 */}
      <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">
        系统设置
      </h1>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {/* 日志设置 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          日志设置
        </h2>

        {/* 日志开关 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">启用日志</p>
            <p className="text-xs text-[var(--text-secondary)]">记录系统运行日志</p>
          </div>
          {/* 自定义 Toggle 开关 */}
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.loggingEnabled}
              onChange={(e) => updateSetting({ loggingEnabled: e.target.checked })}
              disabled={saving}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-[var(--bg-tertiary)] transition-colors peer-checked:bg-[var(--accent)] peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {/* 日志级别 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">日志级别</p>
            <p className="text-xs text-[var(--text-secondary)]">控制日志输出详细程度</p>
          </div>
          <select
            value={settings.logLevel}
            onChange={(e) => updateSetting({ logLevel: e.target.value })}
            disabled={saving}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-50"
          >
            {LOG_LEVELS.map((lv) => (
              <option key={lv} value={lv}>{lv}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 数据管理 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          数据管理
        </h2>

        {/* 缓存记录数 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">缓存记录数</p>
            <p className="text-xs text-[var(--text-secondary)]">当前缓存的历史记录数量</p>
          </div>
          <span className="font-mono-heading text-lg font-bold text-[var(--accent)]">
            {settings.cacheCount}
          </span>
        </div>

        {/* 清除缓存 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">清除缓存</p>
            <p className="text-xs text-[var(--text-secondary)]">清除本地缓存数据</p>
          </div>
          <button
            onClick={handleClearCache}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/20 disabled:opacity-50"
          >
            <Trash2 size={14} />
            清除
          </button>
        </div>

        {/* 清除全部数据 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">清除全部数据</p>
            <p className="text-xs text-[var(--text-secondary)]">删除所有数据并退出登录</p>
          </div>
          <button
            onClick={handleClearAll}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/20 disabled:opacity-50"
          >
            <Trash2 size={14} />
            全部清除
          </button>
        </div>
      </section>

      {/* 账号信息 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          账号信息
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">当前账号</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {token ? '已登录' : '未登录'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3">
        <h2 className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          关于
        </h2>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Info size={14} />
          <span>Bambu Lab 打印历史导出工具</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          版本 1.0.0
        </p>
        <a
          href="https://github.com/michaelggr/ha-printer-analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:underline"
        >
          <ExternalLink size={14} />
          Printer Analytics (HACS)
        </a>
      </section>
    </div>
  );
}
