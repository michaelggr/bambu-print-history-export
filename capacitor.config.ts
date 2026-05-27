import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bambu.exporthistory',
  appName: 'Bambu打印历史导出',
  webDir: 'dist',
  server: {
    // 开发时可以指向本地 Vite 服务器
    // url: 'http://localhost:5173',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F1117',
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
    // 启用 CapacitorHttp 插件，绕过 CORS 限制
    CapacitorHttp: {
      enabled: true,
    },
  },
  // App 图标和启动屏
  icon: 'resources/icon.png',
  splash: 'resources/splash.png',
};

export default config;
