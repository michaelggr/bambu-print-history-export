/// <reference types="vite/client" />

/** 构建时注入的版本号（来自 package.json） */
declare const __APP_VERSION__: string;

/** Capacitor 全局对象类型声明 */
interface CapacitorGlobal {
  isNativePlatform: () => boolean;
  [key: string]: unknown;
}

interface Window {
  Capacitor?: CapacitorGlobal;
}
