/**
 * Electron preload 脚本
 * 目前无需暴露任何 API 到渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
