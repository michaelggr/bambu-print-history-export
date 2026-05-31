import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PrinterIcon from '@/components/PrinterIcon/index';
import './index.scss';

export default function HomePage() {
  const isLoggedIn = Taro.getStorageSync('bambu_token');

  // 如果已登录，直接跳转到历史页
  if (isLoggedIn) {
    Taro.switchTab({ url: '/pages/history/index' });
    return null;
  }

  // 功能卡片数据
  const features = [
    {
      icon: '📊',
      title: '历史记录',
      desc: '查看所有打印任务记录，支持筛选和搜索',
      color: '#00D4AA',
    },
    {
      icon: '📈',
      title: '统计分析',
      desc: '成功率、耗材用量、设备利用率等多维统计',
      color: '#6C5CE7',
    },
    {
      icon: '📤',
      title: '数据导出',
      desc: '支持 JSON/CSV/HA 格式导出和分享',
      color: '#FDCB6E',
    },
    {
      icon: '📥',
      title: '数据导入',
      desc: '从其他平台导入打印记录并合并',
      color: '#FF6B6B',
    },
  ];

  // 优势列表
  const advantages = [
    { text: '🔒 安全可靠 - 数据本地存储，不上传服务器' },
    { text: '⚡ 快速同步 - 增量下载，节省流量和时间' },
    { text: '🎨 深色主题 - 护眼设计，Bambu Lab 品牌风格' },
    { text: '📱 多端支持 - Web/小程序/桌面应用全覆盖' },
  ];

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handlePrivacy = () => {
    Taro.navigateTo({ url: '/pages/privacy-policy/index' });
  };

  const handleAgreement = () => {
    Taro.navigateTo({ url: '/pages/user-agreement/index' });
  };

  return (
    <ScrollView scrollY className="home-page" enableBackToTop>
      {/* 顶部品牌区 */}
      <View className="hero-section">
        <View className="logo-container">
          <PrinterIcon size={100} />
        </View>
        <Text className="app-title">Bambu 打印历史</Text>
        <Text className="app-subtitle">专业的 3D 打印数据管理工具</Text>
        <Text className="version-text">v2.6.0</Text>
      </View>

      {/* 核心功能展示 */}
      <View className="section">
        <Text className="section-title">✨ 核心功能</Text>
        <View className="feature-grid">
          {features.map((item, index) => (
            <View key={index} className="feature-card" style={{ borderTopColor: item.color }}>
              <Text className="feature-icon">{item.icon}</Text>
              <Text className="feature-title">{item.title}</Text>
              <Text className="feature-desc">{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 产品优势 */}
      <View className="section">
        <Text className="section-title">🎯 为什么选择我们？</Text>
        <View className="advantage-list">
          {advantages.map((item, index) => (
            <View key={index} className="advantage-item">
              <Text className="advantage-text">{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 使用流程 */}
      <View className="section">
        <Text className="section-title">🚀 使用流程</Text>
        <View className="steps-container">
          <View className="step-item">
            <View className="step-number">1</View>
            <View className="step-content">
              <Text className="step-title">手机号登录</Text>
              <Text className="step-desc">使用 Bambu Lab 账号的手机号 + 验证码</Text>
            </View>
          </View>
          <View className="step-connector"></View>
          <View className="step-item">
            <View className="step-number">2</View>
            <View className="step-content">
              <Text className="step-title">同步数据</Text>
              <Text className="step-desc">从云端拉取您的所有打印历史记录</Text>
            </View>
          </View>
          <View className="step-connector"></View>
          <View className="step-item">
            <View className="step-number">3</View>
            <View className="step-content">
              <Text className="step-title">分析导出</Text>
              <Text className="step-desc">查看统计图表、导出报告或分享给好友</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 支持的打印机型号 */}
      <View className="section">
        <Text className="section-title">🖨️ 支持的设备</Text>
        <View className="device-grid">
          {['X1', 'X1 Carbon', 'P1P', 'P1S', 'A1', 'A1 Mini'].map((device) => (
            <View key={device} className="device-tag">
              <Text className="device-text">{device}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 登录提示区 */}
      <View className="cta-section">
        <View className="cta-card">
          <Text className="cta-title">开始使用</Text>
          <Text className="cta-desc">
            登录后即可同步您的 Bambu Lab 打印数据
          </Text>
          <View className="cta-button" onClick={handleLogin}>
            <Text className="cta-button-text">立即登录</Text>
          </View>
        </View>
      </View>

      {/* 合规链接 */}
      <View className="footer-links">
        <Text className="footer-link" onClick={handlePrivacy}>隐私政策</Text>
        <Text className="footer-divider">|</Text>
        <Text className="footer-link" onClick={handleAgreement}>用户协议</Text>
      </View>

      {/* 底部版权 */}
      <View className="copyright">
        <Text className="copyright-text">
          基于 Bambu Lab 开放 API 构建 · 非官方工具
        </Text>
        <Text className="copyright-text">© 2024 Bambu 打印历史</Text>
      </View>
    </ScrollView>
  );
}
