﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { View, Text, Button } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';
import { useAppStore } from '@/store';
import { checkDemoMode, isDemoMode } from '@/utils/demo-data';
import PrinterIcon from '@/components/PrinterIcon';
import './index.scss';

export default function SettingsPage() {
  const { history, setLogout } = useAppStore();
  const cacheCount = history.length;
  const [downloading, setDownloading] = useState(false);

  const handleFullDownload = async () => {
    // 演示模式拦截：不支持真实下载
    if (checkDemoMode('全量下载')) return;

    setDownloading(true);
    try {
      const res = await api.fullDownload();
      if (res.success && res.data) {
        useAppStore.getState().loadCachedHistory();
        Taro.showToast({ title: `已下载 ${res.data.total} 条记录`, icon: 'success' });
      } else {
        Taro.showToast({ title: res.error || '下载失败', icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '下载失败', icon: 'none' });
    } finally {
      setDownloading(false);
    }
  };

  const handleClearCache = async () => {
    // 演示模式拦截：不支持清除缓存（会清除演示数据）
    if (checkDemoMode('清除缓存')) return;

    const { confirm } = await Taro.showModal({
      title: '确认清除',
      content: '将清除所有缓存的历史记录数据，不会影响登录状态',
    });
    if (!confirm) return;
    try {
      await api.clearCache();
      useAppStore.getState().loadCachedHistory();
      Taro.showToast({ title: '缓存已清除', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e.message || '清除失败', icon: 'none' });
    }
  };

  const handleClearAll = async () => {
    // 演示模式特殊处理：退出演示模式而不是清除数据
    if (isDemoMode()) {
      const { confirm } = await Taro.showModal({
        title: '退出演示模式',
        content: '当前为演示模式，是否退出演示模式？',
        confirmText: '退出演示',
      });
      if (!confirm) return;
      const { disableDemoMode } = require('@/utils/demo-data');
      disableDemoMode();
      Taro.reLaunch({ url: '/pages/home/index' });
      return;
    }

    const { confirm } = await Taro.showModal({
      title: '确认清除全部',
      content: '将清除所有数据包括登录信息，需要重新登录',
    });
    if (!confirm) return;
    try {
      await api.clearAll();
      setLogout();
      Taro.redirectTo({ url: '/pages/login/index' });
    } catch (e: any) {
      Taro.showToast({ title: e.message || '清除失败', icon: 'none' });
    }
  };

  const handleLogout = async () => {
    // 演示模式特殊处理：退出演示模式
    if (isDemoMode()) {
      const { confirm } = await Taro.showModal({
        title: '退出演示模式',
        content: '确定要退出演示模式吗？',
        confirmText: '退出演示',
      });
      if (!confirm) return;
      const { disableDemoMode } = require('@/utils/demo-data');
      disableDemoMode();
      Taro.reLaunch({ url: '/pages/home/index' });
      return;
    }

    const { confirm } = await Taro.showModal({
      title: '确认登出',
      content: '登出后需要重新登录才能使用',
    });
    if (!confirm) return;
    try {
      await api.logout();
      setLogout();
      Taro.redirectTo({ url: '/pages/login/index' });
    } catch (e: any) {
      // 即使登出API失败，也强制本地登出
      setLogout();
      Taro.redirectTo({ url: '/pages/login/index' });
    }
  };

  return (
    <View className="settings-page">
      <View className="section">
        <View className="section-header">
          <Text className="section-title">数据管理</Text>
          <PrinterIcon size={24} />
        </View>
        <View className="info-row">
          <Text className="info-label">缓存记录数</Text>
          <Text className="info-value">{cacheCount} 条</Text>
        </View>
        <Button
          className="action-btn primary"
          loading={downloading}
          onClick={handleFullDownload}
        >
          重新获取全部数据
        </Button>
        <Button className="action-btn" onClick={handleClearCache}>清除缓存</Button>
        <Button className="action-btn danger" onClick={handleClearAll}>清除全部数据</Button>
      </View>

      <View className="section">
        <View className="section-header">
          <Text className="section-title">账号</Text>
        </View>
        <Button className="action-btn danger" onClick={handleLogout}>退出登录</Button>
      </View>

      <View className="section">
        <View className="section-header">
          <Text className="section-title">关于</Text>
        </View>
        <View className="info-row">
          <Text className="info-label">版本</Text>
          <Text className="info-value">1.0.0</Text>
        </View>
        <View className="info-row">
          <Text className="info-label">项目地址</Text>
          <Text className="info-value link" onClick={() => {
            Taro.setClipboardData({ data: 'https://github.com/nicepkg/bambu-export-web' });
          }}>GitHub</Text>
        </View>
        <View className="info-row">
          <Text className="info-label">隐私政策</Text>
          <Text className="info-value link" onClick={() => {
            Taro.navigateTo({ url: '/pages/privacy-policy/index' });
          }}>查看</Text>
        </View>
        <View className="info-row">
          <Text className="info-label">用户协议</Text>
          <Text className="info-value link" onClick={() => {
            Taro.navigateTo({ url: '/pages/user-agreement/index' });
          }}>查看</Text>
        </View>
      </View>

      {/* 底部品牌标识 */}
      <View className="brand-area">
        <PrinterIcon size={32} />
        <Text className="brand-text">Bambu 打印历史</Text>
      </View>
    </View>
  );
}
