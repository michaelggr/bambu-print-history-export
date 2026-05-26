export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/history/index',
    'pages/stats/index',
    'pages/export/index',
    'pages/settings/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'Bambu打印历史',
    navigationBarTextStyle: 'black',
    backgroundColor: '#6366f1'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#6366f1',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/history/index',
        text: '历史',
        iconPath: 'assets/tabbar/history-72.png',
        selectedIconPath: 'assets/tabbar/history-selected-72.png'
      },
      {
        pagePath: 'pages/stats/index',
        text: '统计',
        iconPath: 'assets/tabbar/stats-72.png',
        selectedIconPath: 'assets/tabbar/stats-selected-72.png'
      },
      {
        pagePath: 'pages/export/index',
        text: '导出',
        iconPath: 'assets/tabbar/export-72.png',
        selectedIconPath: 'assets/tabbar/export-selected-72.png'
      }
    ]
  }
});
