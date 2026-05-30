﻿import { View, Text, Input, Button } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';
import { useAppStore } from '@/store';
import './index.scss';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const setLogin = useAppStore(s => s.setLogin);

  // 如果已登录，跳转到首页
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const { loggedIn } = await api.checkAuth();
        if (loggedIn) {
          Taro.switchTab({ url: '/pages/history/index' });
        }
      } catch (e) {
        console.warn('检查登录状态失败:', e);
      }
    };
    checkLogin();
  }, []);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.sendCode(phone.trim());
      if (res.success) {
        setCountdown(60);

        // 倒计时逻辑
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(res.error || '发送失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.loginWithCode(phone.trim(), code.trim());
      if (res.success && res.token) {
        setLogin(res.token);
        Taro.switchTab({ url: '/pages/history/index' });
      } else {
        setError(res.error || '登录失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login-page">
      <View className="login-header">
        <View className="logo-icon">
          <View style={{
            width: 72,
            height: 82,
            background: 'rgba(0, 212, 170, 0.1)',
            borderRadius: 16,
            border: '2px solid #00D4AA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ color: '#00D4AA', fontSize: 32 }}>🖨️</Text>
          </View>
        </View>
        <Text className="title">Bambu 打印历史</Text>
        <Text className="subtitle">使用手机号验证码登录</Text>
      </View>

      <View className="login-form">
        <Input
          className="input"
          type="number"
          placeholder="手机号"
          value={phone}
          onInput={(e) => setPhone(e.detail.value)}
        />

        <View className="input-row">
          <Input
            className="input input-flex"
            type="number"
            placeholder="验证码"
            value={code}
            onInput={(e) => setCode(e.detail.value)}
          />
          <Button
            className="code-btn"
            size="mini"
            disabled={countdown > 0 || loading}
            onClick={handleSendCode}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </Button>
        </View>

        {error ? <Text className="error-text">{error}</Text> : null}

        <Button
          className="submit-btn"
          type="primary"
          loading={loading}
          onClick={handleLogin}
        >
          登录
        </Button>
      </View>
    </View>
  );
}
