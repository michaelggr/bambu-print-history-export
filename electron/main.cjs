﻿/**
 * Electron 主进程入口
 * 在主进程中直接启动 Express 后端 → 打开窗口加载前端
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow = null;
let serverHandle = null;

async function startServer() {
  // 设置数据目录（cache.ts 读取此环境变量）
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.DATA_DIR = dataDir;
  process.env.PORT = process.env.PORT || '3001';

  if (isDev) {
    // 开发模式：用 tsx 启动 TS 源码
    const { spawn } = require('child_process');
    const child = spawn('npx', ['tsx', 'api/server.ts'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3001' },
      shell: true,
      stdio: 'pipe',
    });
    child.stdout?.on('data', (d) => console.log('[server]', d.toString().trim()));
    child.stderr?.on('data', (d) => console.error('[server-err]', d.toString().trim()));
    return 3001;
  }

  // 生产模式：直接在主进程中 require server.cjs 并启动
  const serverPath = path.join(__dirname, '..', 'dist-server', 'server.cjs');
  const serverModule = require(serverPath);
  serverHandle = serverModule.start();
  return serverHandle.port;
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    title: 'Bambu Lab 打印历史导出工具',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL(`http://localhost:${port}`);
  }
  mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    const port = await startServer();
    createWindow(port);
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(3001);
  });
});

app.on('window-all-closed', () => {
  if (serverHandle?.close) serverHandle.close();
  if (process.platform !== 'darwin') app.quit();
});
