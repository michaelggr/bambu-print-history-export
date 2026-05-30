﻿﻿﻿﻿﻿﻿﻿export default defineAppConfig({
  // 启用按需注入：仅注入当前页面所需的自定义组件和页面代码
  // 优化小程序启动时间和运行时内存占用
  // 基础库要求：2.11.1 及以上版本
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/login/index',
    'pages/history/index',
    'pages/stats/index',
    'pages/export/index',
    'pages/import/index',
    'pages/settings/index',
    'pages/privacy-policy/index',
    'pages/user-agreement/index',
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#0D0F1A',
    navigationBarTitleText: 'Bambu 打印历史',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#5E5E78',
    selectedColor: '#00D4AA',
    backgroundColor: '#161829',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/history/index',
        text: '历史',
      },
      {
        pagePath: 'pages/stats/index',
        text: '统计',
      },
      {
        pagePath: 'pages/export/index',
        text: '导出',
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
      },
    ],
  },
});
