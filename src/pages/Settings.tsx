import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, Info, ExternalLink, Loader2, RefreshCw, Download, MessageCircle, Shield, FileText } from 'lucide-react';
import useAppStore from '@/store';
import { api } from '@/utils/api';
import { isNative, isElectron } from '@/utils/platform';
import ApkInstaller from '@/plugins/ApkInstaller';

/** 当前版本号（构建时从 package.json 注入） */
const APP_VERSION = __APP_VERSION__;
/** GitHub 仓库 */
const GITHUB_REPO = 'michaelggr/bambu-print-history-export';

/** 设置项类型 */
interface SettingsData {
  cacheCount: number;
}

/** 更新信息 */
interface UpdateInfo {
  hasUpdate: boolean;
  latest: string;
  notes: string;
  downloadUrl: string;
  apkUrl: string;
}

// ---------------------------------------------------------------------------
// 语义化版本比较
// ---------------------------------------------------------------------------

/** 比较两个语义化版本号：a > b 返回 1，a < b 返回 -1，相等返回 0 */
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export default function Settings() {
  const navigate = useNavigate();
  const clearAuth = useAppStore((s) => s.clearAuth);

  const [settings, setSettings] = useState<SettingsData>({ cacheCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving] = useState(false);
  const [error, setError] = useState('');
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);

  /** 获取设置 */
  const fetchSettings = useCallback(async () => {
    try {
      const json = await api.getSettings();
      if (json.success !== false) {
        const d = (json.data ?? json) as Record<string, unknown>;
        setSettings({ cacheCount: (d.cacheCount as number) ?? 0 });
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

  /** 检查更新（语义化版本比较） */
  const handleCheckUpdate = useCallback(async () => {
    setUpdateChecking(true);
    setUpdateInfo(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!res.ok) throw new Error('无法获取版本信息');
      const data = await res.json();
      const latest = data.tag_name?.replace(/^v/, '') || '';

      // 从 Release assets 中查找 APK 下载链接
      const apkAsset = (data.assets ?? []).find(
        (a: { name: string; browser_download_url: string }) => a.name.endsWith('.apk')
      );
      const apkUrl = apkAsset?.browser_download_url ?? '';

      const hasUpdate = latest && compareSemver(latest, APP_VERSION) > 0;
      setUpdateInfo({
        hasUpdate,
        latest,
        notes: data.body || '暂无更新说明',
        downloadUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
        apkUrl,
      });
    } catch {
      setUpdateInfo({ hasUpdate: false, latest: APP_VERSION, notes: '检查更新失败，请稍后重试', downloadUrl: '', apkUrl: '' });
    } finally {
      setUpdateChecking(false);
    }
  }, []);

  /** 下载并安装更新 */
  const handleInstallUpdate = useCallback(async () => {
    if (!updateInfo?.apkUrl) {
      // 无 APK 链接，打开浏览器下载页
      window.open(updateInfo?.downloadUrl || `https://github.com/${GITHUB_REPO}/releases/latest`, '_blank');
      return;
    }

    // Android 原生端：下载 APK 并触发安装
    if (isNative()) {
      setInstalling(true);
      try {
        await ApkInstaller.installApk({ url: updateInfo.apkUrl });
      } catch {
        // 安装器启动后可能抛出异常（用户拒绝权限等），回退到浏览器
        window.open(updateInfo.downloadUrl, '_blank');
      } finally {
        setInstalling(false);
      }
      return;
    }

    // Electron / Web：打开浏览器下载
    if (isElectron()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (window as any).electronAPI?.openExternal?.(updateInfo.downloadUrl);
      } catch {
        window.open(updateInfo.downloadUrl, '_blank');
      }
      return;
    }

    window.open(updateInfo.downloadUrl, '_blank');
  }, [updateInfo]);

  /** 打开 QQ 群 */
  const handleQQGroup = useCallback(async () => {
    const qqUrl = 'https://qm.qq.com/q/9paJFuZbCE';

    if (isNative()) {
      try {
        const encodedUrl = encodeURIComponent(qqUrl);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).location.href = `mqqopensdkapi://bizAgent/qm/qr?url=${encodedUrl}`;
        setTimeout(() => { window.open(qqUrl, '_blank'); }, 1500);
      } catch {
        window.open(qqUrl, '_blank');
      }
    } else if (isElectron()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (window as any).electronAPI?.openExternal?.(qqUrl);
      } catch {
        window.open(qqUrl, '_blank');
      }
    } else {
      window.open(qqUrl, '_blank');
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
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{updateInfo.notes}</p>
                <button onClick={handleInstallUpdate} disabled={installing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-50">
                  {installing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {installing ? '下载安装中...' : (isNative() && updateInfo.apkUrl ? '下载并安装' : '下载更新')}
                </button>
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
          <button onClick={handleQQGroup}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:underline bg-transparent border-none cursor-pointer">
            <MessageCircle size={14} />QQ 交流群
          </button>
        </div>

        {/* 合规文档 */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[var(--border)] mt-4">
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
            <Shield size={14} />隐私政策
          </a>
          <a href="/user-agreement" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
            <FileText size={14} />用户协议
          </a>
        </div>
      </section>
    </div>
  );
}
