﻿/**
 * Electron 主进程入口
 * 纯前端架构：不再启动 Express 后端，
 * 通过 IPC 代理渲染进程的 HTTPS 请求（绕过浏览器 CORS 限制）
 */
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const isDev = !app.isPackaged;
let mainWindow = null;

// ---------------------------------------------------------------------------
// HTTPS 请求代理（供渲染进程通过 IPC 调用）
// ---------------------------------------------------------------------------

/** 安全解码响应体：处理 gzip 压缩和编码 */
function decodeResponse(buffer) {
  // 检测 gzip 压缩（magic bytes: 1F 8B）
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    buffer = zlib.gunzipSync(buffer);
  }
  try {
    return buffer.toString('utf-8');
  } catch {
    try {
      const decoder = new TextDecoder('gbk');
      return decoder.decode(buffer);
    } catch {
      return buffer.toString('latin1');
    }
  }
}

/** 发送 HTTPS 请求 */
function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = decodeResponse(buffer);
        try {
          const data = JSON.parse(text);
          resolve({ status: res.statusCode, data });
        } catch {
          resolve({ status: res.statusCode, data: {} });
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// IPC: 代理渲染进程的 HTTP 请求
ipcMain.handle('fetch', async (_event, { url, method, headers, body }) => {
  try {
    return await httpsRequest(url, { method, headers }, body);
  } catch (err) {
    return { status: 0, data: { error: err.message || '请求失败' } };
  }
});

// IPC: 允许渲染进程调用 shell.openExternal
ipcMain.handle('open-external', async (_event, url) => {
  await shell.openExternal(url);
});

// ---------------------------------------------------------------------------
// 窗口管理
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    title: 'Bambu Lab 打印历史导出工具',
    icon: path.join(__dirname, '../resources/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：直接加载打包后的前端文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  mainWindow.on('closed', () => { mainWindow = null; });

  // 外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
