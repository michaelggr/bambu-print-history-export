﻿﻿﻿﻿﻿﻿﻿﻿/**
 * Electron preload 脚本
 * 暴露 IPC API 到渲染进程：
 * - platform: 当前操作系统平台
 * - openExternal: 用系统浏览器打开链接
 * - fetch: 代理 HTTPS 请求到主进程（绕过 CORS）
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  /** 代理 HTTPS 请求到主进程 */
  fetch: (options) => ipcRenderer.invoke('fetch', options),
});
