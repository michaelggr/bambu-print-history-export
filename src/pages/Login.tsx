import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Phone, Loader2 } from 'lucide-react';
import useAppStore from '@/store';
import { api } from '@/utils/api';

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, setAuth } = useAppStore();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/', { replace: true });
      return;
    }
    api.checkAuth()
      .then(({ loggedIn, token }) => {
        if (loggedIn) {
          setAuth(token || 'cached');
          navigate('/', { replace: true });
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    setError('');
    try {
      const result = await api.sendCode(phone.trim());
      if (result.success) {
        setCountdown(60);
      } else {
        setError(result.error || '发送验证码失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  }, [phone]);

  const handleLogin = useCallback(async () => {
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await api.loginWithCode(phone.trim(), code.trim());
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
  }, [phone, code, setAuth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md mx-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Box size={32} />
          </div>
          <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">
            Bambu 打印历史
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            使用手机号验证码登录
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Phone
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="tel"
              placeholder="手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>

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

          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}

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
