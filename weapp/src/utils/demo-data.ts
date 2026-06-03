﻿import type { BambuHistoryItem } from '@/types/bambu';
import Taro from '@tarojs/taro';
import { saveToken, clearToken, saveHistoryCache } from './bambu-cache';

// 演示模式专用的假token（用于绕过登录检查）
const DEMO_TOKEN = 'demo_mode_token_for_review_testing';

// 从真实数据中提取的脱敏演示数据（基于 bambu_history_20260531.json）
export const DEMO_HISTORY: BambuHistoryItem[] = [
  {
    id: 'DEMO-001',
    title: '宜家洞洞板挂钩 6个尺寸（卡得紧）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-31 03:12:00',
    endTime: '2026-05-31 03:35:00',
    costTime: 1380,
    weight: 6.6,
    nozzleTemp: 220,
    bedTemp: 60,
    speed: 100,
    nozzleSize: '0.4',
    filamentType: 'PETG',
    filamentColor: '#FFFFFF',
    bedType: 'Textured PEI Plate',
    sliceMode: 'cloud_slice',
    amsUsed: true,
    multiColor: false,
    totalColors: 1,
    cover: 'https://public-cdn.bblmw.cn/makerworld/cache/2/CN50140fddad5f7f/60603990/3mf/1/%23898989FF/REP1/SKP402_422_462_482_502/Metadata/plate_1.png',
    deviceId: 'X1C-DEMO-001',
    deviceName: 'X1 Carbon',
    designId: 1289373,
  },
  {
    id: 'DEMO-002',
    title: '洞洞板倾斜收纳盒（适合多种洞洞板）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-30 03:54:00',
    endTime: '2026-05-30 04:38:00',
    costTime: 2640,
    weight: 45.2,
    nozzleTemp: 230,
    bedTemp: 60,
    speed: 80,
    nozzleSize: '0.4',
    filamentType: 'PLA',
    filamentColor: '#00D4AA',
    bedType: 'Smooth PEI Plate',
    sliceMode: 'cloud_slice',
    amsUsed: false,
    multiColor: false,
    totalColors: 1,
    cover: 'https://public-cdn.bblmw.cn/makerworld/cache/2/CN9e86 59bb64f3e/87987887/3mf/1/REP10/Metadata/plate_1.png',
    deviceId: 'P1S-DEMO-002',
    deviceName: 'P1S',
    designId: 1010986,
  },
  {
    id: 'DEMO-003',
    title: 'Benchy 标准测试件（压力测试）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-29 14:23:00',
    endTime: '2026-05-29 15:47:00',
    costTime: 5240,
    weight: 125.6,
    nozzleTemp: 240,
    bedTemp: 60,
    speed: 60,
    nozzleSize: '0.4',
    filamentType: 'PLA Basic',
    filamentColor: '#FF6B6B',
    bedType: 'Engineering Plate',
    sliceMode: 'lan_file',
    amsUsed: true,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'X1C-DEMO-001',
    deviceName: 'X1 Carbon',
    designId: 999999,
  },
  {
    id: 'DEMO-004',
    title: 'iPhone 15 手机壳（碳纤维纹理）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-28 09:12:00',
    endTime: '2026-05-28 11:34:00',
    costTime: 8820,
    weight: 89.3,
    nozzleTemp: 235,
    bedTemp: 55,
    speed: 70,
    nozzleSize: '0.25',
    filamentType: 'PETG CF',
    filamentColor: '#000000',
    bedType: 'Textured PEI Plate',
    sliceMode: 'cloud_file',
    amsUsed: false,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'P1S-DEMO-002',
    deviceName: 'P1S',
    designId: 888888,
  },
  {
    id: 'DEMO-005',
    title: '机械键盘键帽（Cherry MX 高度）',
    status: 3,
    statusText: '失败',
    startTime: '2026-05-27 16:45:00',
    endTime: '2026-05-27 17:20:00',
    costTime: 2100,
    weight: 45.2,
    nozzleTemp: 250,
    bedTemp: 80,
    speed: 90,
    nozzleSize: '0.6',
    filamentType: 'ABS',
    filamentColor: '#FDCB6E',
    bedType: 'Textured PEI Plate',
    sliceMode: 'cloud_slice',
    amsUsed: false,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'A1-DEMO-003',
    deviceName: 'A1 Mini',
    designId: 777777,
  },
  {
    id: 'DEMO-006',
    title: '龙猫摆件（多色打印）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-26 20:30:00',
    endTime: '2026-05-27 02:15:00',
    costTime: 20100,
    weight: 284.3,
    nozzleTemp: 230,
    bedTemp: 60,
    speed: 65,
    nozzleSize: '0.4',
    filamentType: 'PLA',
    filamentColor: '#2850E0',
    bedType: 'textured_plate',
    sliceMode: 'lan_file',
    amsUsed: true,
    multiColor: true,
    totalColors: 4,
    colorUsage: [
      { color: '#FFFFFF', type: 'PLA', weight_g: 120, length_m: 4.0 },
      { color: '#FF6B6B', type: 'PLA', weight_g: 85, length_m: 2.8 },
      { color: '#FDCB6E', type: 'PLA', weight_g: 42, length_m: 1.4 },
      { color: '#000000', type: 'PLA', weight_g: 37.3, length_m: 1.3 },
    ],
    cover: '',
    deviceId: 'X1C-DEMO-001',
    deviceName: 'X1 Carbon',
    designId: 2038920,
  },
  {
    id: 'DEMO-007',
    title: '桌面收纳盒套装（带盖子）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-25 19:39:00',
    endTime: '2026-05-26 03:01:00',
    costTime: 19260,
    weight: 196.0,
    nozzleTemp: 225,
    bedTemp: 60,
    speed: 75,
    nozzleSize: '0.4',
    filamentType: 'PETG',
    filamentColor: '#898989',
    bedType: 'Textured PEI Plate',
    sliceMode: 'cloud_slice',
    amsUsed: false,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'X1-DEMO-004',
    deviceName: 'X1',
    designId: 983104,
  },
  {
    id: 'DEMO-008',
    title: 'Arduino 外壳（带散热孔）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-24 08:15:00',
    endTime: '2026-05-24 09:48:00',
    costTime: 5580,
    weight: 34.5,
    nozzleTemp: 220,
    bedTemp: 50,
    speed: 110,
    nozzleSize: '0.4',
    filamentType: 'ABS+',
    filamentColor: '#6C5CE7',
    bedType: 'Smooth PEI Plate',
    sliceMode: 'cloud_slice',
    amsUsed: true,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'P1P-DEMO-005',
    deviceName: 'P1P',
    designId: 666666,
  },
  {
    id: 'DEMO-009',
    title: 'LED 灯条支架（可调节角度）',
    status: 3,
    statusText: '失败',
    startTime: '2026-05-23 14:20:00',
    endTime: '2026-05-23 16:12:00',
    costTime: 6720,
    weight: 78.9,
    nozzleTemp: 245,
    bedTemp: 70,
    speed: 85,
    nozzleSize: '0.4',
    filamentType: 'PETG',
    filamentColor: '#00D4AA',
    bedType: 'textured_plate',
    sliceMode: 'lan_file',
    amsUsed: true,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'X1C-DEMO-001',
    deviceName: 'X1 Carbon',
    designId: 1117851,
  },
  {
    id: 'DEMO-010',
    title: '花瓶（螺旋纹路设计）',
    status: 2,
    statusText: '成功',
    startTime: '2026-05-22 21:04:00',
    endTime: '2026-05-23 00:15:00',
    costTime: 11820,
    weight: 145.8,
    nozzleTemp: 230,
    bedTemp: 60,
    speed: 70,
    nozzleSize: '0.25',
    filamentType: 'PETG',
    filamentColor: '#FFFFFF',
    bedType: 'textured_plate',
    sliceMode: 'cloud_file',
    amsUsed: false,
    multiColor: false,
    totalColors: 1,
    cover: '',
    deviceId: 'P1S-DEMO-002',
    deviceName: 'P1S',
    designId: 1756783,
  },
];

// 演示模式统计信息（用于统计页）
export const DEMO_STATS = {
  totalCount: DEMO_HISTORY.length,
  successCount: DEMO_HISTORY.filter(item => item.status === 2).length,
  failedCount: DEMO_HISTORY.filter(item => item.status === 3).length,
  successRate: ((DEMO_HISTORY.filter(item => item.status === 2).length / DEMO_HISTORY.length) * 100).toFixed(1),
  totalWeight: DEMO_HISTORY.reduce((sum, item) => sum + (item.weight || 0), 0),
  totalTime: DEMO_HISTORY.reduce((sum, item) => sum + (item.costTime || 0), 0),
  devices: ['X1 Carbon', 'P1S', 'X1', 'A1 Mini', 'P1P'],
  filaments: ['PETG', 'PLA', 'ABS', 'PETG CF', 'ABS+'],
};

/**
 * 启动演示模式 - 将假数据写入 store 和缓存
 */
export function enableDemoMode(): void {
  try {
    // 设置假token，让系统认为已登录（演示模式专用）
    saveToken(DEMO_TOKEN, 'demo_user');
    // 使用标准的缓存保存函数，确保数据格式正确
    saveHistoryCache(DEMO_HISTORY);
    // 标记为演示模式
    Taro.setStorageSync('bambu_demo_mode', 'true');
    console.log('[Demo] 演示模式已启用，已写入', DEMO_HISTORY.length, '条演示数据');
  } catch (e) {
    console.error('[Demo] 启用演示模式失败:', e);
  }
}

/**
 * 关闭演示模式 - 清除缓存中的演示数据
 */
export function disableDemoMode(): void {
  try {
    // 清除演示模式的假token
    clearToken();
    Taro.removeStorageSync('bambu_demo_mode');
    // 不清除历史数据，让用户决定是否清除
    console.log('[Demo] 演示模式已关闭');
  } catch (e) {
    console.error('[Demo] 关闭演示模式失败:', e);
  }
}

/**
 * 检查当前是否处于演示模式
 */
export function isDemoMode(): boolean {
  return Taro.getStorageSync('bambu_demo_mode') === 'true';
}

/**
 * 演示模式下显示提示并阻止操作（用于需要真实API调用的按钮）
 * @param actionName 操作名称，如"下载"、"导出"等
 * @returns 是否处于演示模式（true表示已拦截）
 */
export function checkDemoMode(actionName: string): boolean {
  if (isDemoMode()) {
    Taro.showToast({
      title: `演示模式不支持${actionName}`,
      icon: 'none',
      duration: 2000,
    });
    return true;
  }
  return false;
}
