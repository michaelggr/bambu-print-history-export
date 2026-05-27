/**
 * APK 安装器 — Capacitor 自定义插件
 * 用于下载 APK 文件并触发 Android 系统安装器
 *
 * Android 端：下载 APK → 触发 PackageInstaller intent
 * Web/Electron：直接打开浏览器下载链接
 */

import { registerPlugin } from '@capacitor/core';

/** 插件接口定义 */
export interface ApkInstallerPlugin {
  /** 下载并安装 APK（Android 专用） */
  installApk(options: { url: string }): Promise<void>;
}

// 注册插件（Android 端会自动绑定原生实现）
const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');

export default ApkInstaller;
