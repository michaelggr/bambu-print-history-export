/** 检测是否运行在 Capacitor 原生平台（Android/iOS） */
export const isNative = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};

/** 检测是否运行在 Electron 桌面端 */
export const isElectron = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};

/** 获取平台名称 */
export const getPlatform = (): 'native' | 'electron' | 'web' => {
  if (isNative()) return 'native';
  if (isElectron()) return 'electron';
  return 'web';
};
