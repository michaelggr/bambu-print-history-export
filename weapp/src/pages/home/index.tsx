import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PrinterIcon from '@/components/PrinterIcon/index';
import { enableDemoMode } from '@/utils/demo-data';
import './index.scss';

// 示例数据（模拟真实打印记录，让审核员看到实际效果）
const DEMO_HISTORY = [
  {
    id: 'demo-001',
    title: 'Benchy (压力测试件)',
    status: 2,
    statusText: '成功',
    deviceName: 'X1 Carbon',
    startTime: '2024-05-30 14:23:00',
    endTime: '2024-05-30 15:47:00',
    weight: 125.6,
    costTime: 5240,
    nozzleSize: '0.4',
    filamentType: 'PLA Basic',
    filamentColor: '#FF6B6B',
  },
  {
    id: 'demo-002',
    title: 'iPhone 15 手机壳',
    status: 2,
    statusText: '成功',
    deviceName: 'P1S',
    startTime: '2024-05-29 09:12:00',
    endTime: '2024-05-29 11:34:00',
    weight: 89.3,
    costTime: 8820,
    nozzleSize: '0.25',
    filamentType: 'PETG CF',
    filamentColor: '#00D4AA',
  },
  {
    id: 'demo-003',
    name: '机械键盘键帽',
    status: 3,
    statusText: '失败',
    deviceName: 'X1',
    startTime: '2024-05-28 16:45:00',
    endTime: '2024-05-28 17:20:00',
    weight: 45.2,
    costTime: 2100,
    nozzleSize: '0.6',
    filamentType: 'ABS',
    filamentColor: '#FDCB6E',
  },
];

const FAQ_LIST = [
  { q: '这个小程序安全吗？', a: '非常安全！所有数据存储在您的手机本地，我们不会收集或上传任何个人信息。' },
  { q: '支持哪些打印机型号？', a: '支持拓竹（Bambu Lab）全系列：X1/X1C/P1P/P1S/A1/A1 Mini 等。' },
  { q: '需要付费吗？', a: '完全免费！本工具基于 Bambu Lab 开放 API 构建，无任何收费。' },
  { q: '数据准确吗？', a: '100% 准确！数据直接从 Bambu Lab 官方服务器同步，与官方 App 一致。' },
];

export default function HomePage() {
  const isLoggedIn = Taro.getStorageSync('bambu_token');

  // 如果已登录，直接跳转到历史页
  if (isLoggedIn) {
    Taro.switchTab({ url: '/pages/history/index' });
    return null;
  }

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  // 启动演示模式
  const handleDemoMode = () => {
    enableDemoMode();
    Taro.showToast({
      title: '正在进入演示模式...',
      icon: 'loading',
      duration: 1000,
    });
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/history/index' });
    }, 1000);
  };

  const handlePrivacy = () => {
    Taro.navigateTo({ url: '/pages/privacy-policy/index' });
  };

  const handleAgreement = () => {
    Taro.navigateTo({ url: '/pages/user-agreement/index' });
  };

  // 格式化时间显示
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h${m}m`;
  };

  return (
    <ScrollView scrollY className="home-page" enableBackToTop>
      {/* ====== 第一屏：品牌区 ====== */}
      <View className="hero-section">
        <View className="logo-container">
          <PrinterIcon size={90} />
        </View>
        <Text className="app-title">Bambu 打印历史</Text>
        <Text className="app-subtitle">专业的拓竹 3D 打印数据管理工具</Text>
        <Text className="version-badge">v2.6.0 · 完全免费</Text>
      </View>

      {/* ====== 第二屏：功能亮点（横向滚动） ====== */}
      <View className="section">
        <Text className="section-title">✨ 核心功能</Text>
        <ScrollView scrollX className="feature-scroll" showScrollbar={false}>
          <View className="feature-list">
            {[
              { icon: '📊', title: '历史记录', desc: '查看所有打印任务\n支持筛选和搜索', color: '#00D4AA' },
              { icon: '📈', title: '统计分析', desc: '成功率/耗材用量\n设备利用率统计', color: '#6C5CE7' },
              { icon: '📤', title: '数据导出', desc: 'JSON/CSV/HA格式\n一键分享给好友', color: '#FDCB6E' },
              { icon: '📥', title: '数据导入', desc: '从其他平台导入\n支持合并或覆盖', color: '#FF6B6B' },
            ].map((item, idx) => (
              <View key={idx} className="feature-card-mini" style={{ borderTopColor: item.color }}>
                <Text className="feature-icon-lg">{item.icon}</Text>
                <Text className="feature-title-sm">{item.title}</Text>
                <Text className="feature-desc-sm">{item.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ====== 第三屏：示例数据演示（关键！展示实际功能） ====== */}
      <View className="section demo-section">
        <View className="demo-header">
          <Text className="section-title">📋 功能演示</Text>
          <Text className="demo-hint">以下为示例数据，登录后查看您的真实记录</Text>
        </View>

        {/* 示例打印记录列表 */}
        <View className="demo-list">
          {DEMO_HISTORY.map((item, idx) => (
            <View key={idx} className="demo-card">
              <View className="demo-card-header">
                <View className="demo-status-dot" style={{ backgroundColor: item.status === 2 ? '#00D4AA' : '#FF6B6B' }} />
                <Text className="demo-card-title" numberOfLines={1}>{item.title}</Text>
                <Text className={`demo-badge ${item.status === 2 ? 'success' : 'failed'}`}>
                  {item.statusText}
                </Text>
              </View>

              <View className="demo-card-body">
                <View className="demo-info-row">
                  <Text className="demo-label">设备</Text>
                  <Text className="demo-value">{item.deviceName}</Text>
                </View>
                <View className="demo-info-row">
                  <Text className="demo-label">耗时</Text>
                  <Text className="demo-value">{formatDuration(item.costTime)}</Text>
                </View>
                <View className="demo-info-row">
                  <Text className="demo-label">耗材</Text>
                  <View className="demo-filament-info">
                    <View className="color-dot" style={{ backgroundColor: item.filamentColor }} />
                    <Text className="demo-value">{item.filamentType} · {item.weight}g</Text>
                  </View>
                </View>
                <View className="demo-info-row">
                  <Text className="demo-label">喷嘴</Text>
                  <Text className="demo-value">{item.nozzleSize}mm</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 统计卡片预览 */}
        <View className="stats-preview">
          <Text className="stats-title">📈 统计预览（示例）</Text>
          <View className="stats-grid-mini">
            {[
              { label: '总打印数', value: '156', unit: '次' },
              { label: '成功率', value: '94.2', unit: '%' },
              { label: '总耗材', value: '2.8', unit: 'kg' },
              { label: '总时长', value: '128', unit: 'h' },
            ].map((stat, idx) => (
              <View key={idx} className="stat-card-mini">
                <Text className="stat-value">{stat.value}<Text className="stat-unit">{stat.unit}</Text></Text>
                <Text className="stat-label">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ====== 第四屏：产品优势 ====== */}
      <View className="section">
        <Text className="section-title">🎯 为什么选择我们？</Text>
        <View className="advantage-grid">
          {[
            { icon: '🔒', title: '安全可靠', desc: '数据本地存储，绝不上传服务器' },
            { icon: '⚡', title: '快速同步', desc: '增量下载机制，节省流量和时间' },
            { icon: '🎨', title: '深色主题', desc: '护眼设计，符合 Bambu Lab 品牌风格' },
            { icon: '📱', title: '多端支持', desc: 'Web/微信小程序/桌面应用全覆盖' },
            { icon: '🆓', title: '完全免费', desc: '开源项目，无任何隐藏收费' },
            { icon: '🔄', title: '实时同步', desc: '与 Bambu Lab 云端数据保持一致' },
          ].map((item, idx) => (
            <View key={idx} className="advantage-item-new">
              <Text className="advantage-icon">{item.icon}</Text>
              <View className="advantage-content">
                <Text className="advantage-title">{item.title}</Text>
                <Text className="advantage-desc">{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ====== 第五屏：支持的设备和账号 ====== */}
      <View className="section support-section">
        <Text className="section-title">🖨️ 支持范围</Text>

        <View className="support-block">
          <Text className="support-subtitle">✅ 支持的打印机型号</Text>
          <View className="device-tags">
            {['X1', 'X1 Carbon', 'P1P', 'P1S', 'A1', 'A1 Mini', 'X1E'].map((d) => (
              <View key={d} className="device-tag-new"><Text className="device-text-new">{d}</Text></View>
            ))}
          </View>
        </View>

        <View className="support-block">
          <Text className="support-subtitle">🇨🇳 账号要求</Text>
          <View className="account-single">
            <View className="account-type-card featured">
              <Text className="account-icon">📱</Text>
              <Text className="account-name">拓竹中国区账号</Text>
              <Text className="account-desc">使用手机号 + 验证码登录</Text>
              <View className="account-features">
                <Text className="feature-check">✅ 已测试验证</Text>
                <Text className="feature-check">✅ 官方 API 支持</Text>
                <Text className="feature-check">✅ 数据同步稳定</Text>
              </View>
            </View>
          </View>

          <View className="notice-box">
            <Text className="notice-icon">ℹ️</Text>
            <Text className="notice-text">
              本工具基于拓竹（Bambu Lab）官方开放 API 构建，
              目前仅支持中国区账号（手机号登录），需要您拥有有效的拓竹账号才能同步打印数据。
            </Text>
          </View>
        </View>
      </View>

      {/* ====== 第六屏：常见问题 FAQ ====== */}
      <View className="section faq-section">
        <Text className="section-title">❓ 常见问题</Text>
        <View className="faq-list">
          {FAQ_LIST.map((faq, idx) => (
            <View key={idx} className="faq-item">
              <Text className="faq-q">Q: {faq.q}</Text>
              <Text className="faq-a">A: {faq.a}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ====== 第七屏：CTA 登录区域 ====== */}
      <View className="cta-section-enhanced">
        <View className="cta-main-card">
          <View className="cta-glow"></View>
          <Text className="cta-headline">准备好管理您的打印数据了吗？</Text>
          <Text className="cta-subheadline">
            登录后即可同步您在拓竹云端的全部打印历史
          </Text>

          <View className="cta-features-check">
            {['✅ 同步所有打印记录', '✅ 查看详细统计数据', '✅ 导出多种格式报告', '✅ 分享给好友或社群'].map((check, idx) => (
              <Text key={idx} className="check-item">{check}</Text>
            ))}
          </View>

          <View className="cta-button-main" onClick={handleLogin}>
            <Text className="cta-button-text-main">立即登录使用</Text>
          </View>

          <View className="demo-mode-divider">
            <Text className="divider-line"></Text>
            <Text className="divider-text">或</Text>
            <Text className="divider-line"></Text>
          </View>

          <View className="cta-button-demo" onClick={handleDemoMode}>
            <Text className="cta-button-text-demo">🎮 免登录体验演示</Text>
          </View>

          <Text className="cta-no-account">
            还没有拓竹账号？
            <Text className="link-text" onClick={() => Taro.setClipboardData({ data: 'https://www.bambulab.com' })}>
              前往官网注册 →
            </Text>
          </Text>
        </View>
      </View>

      {/* ====== 底部合规信息 ====== */}
      <View className="footer-compliance">
        <View className="compliance-links">
          <Text className="compliance-link" onClick={handlePrivacy}>隐私政策</Text>
          <Text className="divider">·</Text>
          <Text className="compliance-link" onClick={handleAgreement}>用户协议</Text>
          <Text className="divider">·</Text>
          <Text className="compliance-link" onClick={() => Taro.setClipboardData({ data: 'https://github.com/nicepkg/bambu-export-web' })}>
            开源代码
          </Text>
        </View>

        <View className="copyright-new">
          <Text className="copyright-line">基于 Bambu Lab 开放 API 构建 · 非官方工具</Text>
          <Text className="copyright-line">© 2024 Bambu 打印历史 · MIT 开源协议</Text>
          <Text className="copyright-line disclaimer">
            本工具与深圳拓竹科技有限公司无任何关联或背书
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
