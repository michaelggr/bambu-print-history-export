import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Mail, Lock, Loader2 } from 'lucide-react';
import useAppStore from '@/store';
import { api } from '@/utils/api';

type LoginMode = 'code' | 'password';

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, setAuth } = useAppStore();

  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<LoginMode>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 启动时检查后端登录状态，已登录则自动设置前端 token
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/', { replace: true });
      return;
    }
    // 检查后端/本地是否有缓存的 token
    api.checkAuth()
      .then(({ loggedIn, token }) => {
        if (loggedIn) {
          // native 模式下 token 存在 localStorage，需要同步到 store
          setAuth(token || 'cached');
          navigate('/', { replace: true });
        }
      })
      .catch(() => { /* 忽略网络错误 */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  /** 发送验证码 */
  const handleSendCode = useCallback(async () => {
    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    setError('');
    try {
      const result = await api.sendCode(account.trim());
      if (result.success) {
        setCountdown(60);
      } else {
        setError(result.error || '发送验证码失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  }, [account]);

  /** 登录 */
  const handleLogin = useCallback(async () => {
    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    if (mode === 'code' && !code.trim()) {
      setError('请输入验证码');
      return;
    }
    if (mode === 'password' && !password) {
      setError('请输入密码');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let result: { success: boolean; token?: string; error?: string };
      if (mode === 'code') {
        result = await api.loginWithCode(account.trim(), code.trim());
      } else {
        result = await api.loginWithPassword(account.trim(), password);
      }

      if (result.success && result.token) {
        setAuth(result.token);
        navigate('/', { replace: true });
      } else {
        setError(result.error || '登录失败，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [account, code, password, mode, setAuth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      {/* 登录卡片 */}
      <div className="w-full max-w-md mx-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8">
        {/* 头部图标 + 标题 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Box size={32} />
          </div>
          <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">
            Bambu 打印历史
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            登录 Bambu Cloud 账号
          </p>
        </div>

        {/* 账号输入 */}
        <div className="space-y-4">
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="手机号或邮箱"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>

          {/* 登录方式切换 Tab */}
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-1">
            <button
              onClick={() => { setMode('code'); setError(''); }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === 'code'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              验证码登录
            </button>
            <button
              onClick={() => { setMode('password'); setError(''); }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === 'password'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              密码登录
            </button>
          </div>

          {/* 验证码模式 */}
          {mode === 'code' && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)]"
              />
              <button
                onClick={handleSendCode}
                disabled={countdown > 0}
                className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  countdown > 0
                    ? 'cursor-not-allowed bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                    : 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20'
                }`}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          )}

          {/* 密码模式 */}
          {mode === 'password' && (
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)]"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-bold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-dim)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
