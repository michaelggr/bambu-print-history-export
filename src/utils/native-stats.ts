﻿/**
 * 安卓/原生端统计计算 — 从 Bambu Cloud 原始记录计算完整统计数据
 * 逻辑对齐后端 api/services/bambu.ts 的 calculateStats()
 */

import type { BambuHistoryItem, PeriodStats, StatsResult } from '@/types/bambu';

// 类型别名：保持内部命名一致性
export type NativeBambuItem = BambuHistoryItem;
export type NativePeriodStats = PeriodStats;
export type NativeStatsResult = StatsResult;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function parseColor(colorStr?: string | null): string {
  if (!colorStr) return '';
  const s = String(colorStr).trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    return hex.length >= 6 ? `#${hex.slice(0, 6).toUpperCase()}` : s.toUpperCase();
  }
  if (s.startsWith('rgb')) {
    try {
      const inner = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'));
      const parts = inner.split(',').map(p => p.trim());
      const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2]);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    } catch { return s; }
  }
  if (s.length >= 6) {
    try { parseInt(s.slice(0, 6), 16); return `#${s.slice(0, 6).toUpperCase()}`; } catch { /* fall through */ }
  }
  return s;
}

function extractColorsUsed(item: NativeBambuItem): string[] {
  const colors: string[] = [];
  const amsList = item.amsDetailMapping;
  if (Array.isArray(amsList)) {
    for (const ams of amsList) {
      if (ams?.sourceColor) {
        const parsed = parseColor(ams.sourceColor);
        if (parsed && !colors.includes(parsed)) colors.push(parsed);
      }
    }
  }
  if (colors.length === 0 && item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      if (fil?.color) {
        const parsed = parseColor(fil.color);
        if (parsed && !colors.includes(parsed)) colors.push(parsed);
      }
    }
  }
  if (colors.length === 0 && item.filamentColor) {
    for (const c of String(item.filamentColor).split(';')) {
      const parsed = parseColor(c.trim());
      if (parsed && !colors.includes(parsed)) colors.push(parsed);
    }
  }
  return colors;
}

function extractFilamentInfo(item: NativeBambuItem): { type: string; color: string } {
  let filamentType = '', filamentColor = '';
  const amsList = item.amsDetailMapping;
  if (Array.isArray(amsList) && amsList.length > 0) {
    const first = amsList[0];
    filamentType = first?.filamentType ?? '';
    filamentColor = first?.sourceColor ? parseColor(first.sourceColor) : '';
  }
  if (!filamentType && item.filament && typeof item.filament === 'object') {
    for (const key of Object.keys(item.filament).sort()) {
      const fil = item.filament[key];
      if (!filamentType) filamentType = fil?.type ?? '';
      if (!filamentColor) filamentColor = fil?.color ? parseColor(fil.color) : '';
      if (filamentType && filamentColor) break;
    }
  }
  if (!filamentType) filamentType = item.filamentType ?? '';
  if (!filamentColor) filamentColor = parseColor(item.filamentColor);
  return { type: filamentType, color: filamentColor };
}

function extractWeight(item: NativeBambuItem): number {
  let totalWeight = 0;
  if (item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      totalWeight += Number(fil?.weight ?? 0) || 0;
    }
  }
  if (totalWeight === 0) totalWeight = Number(item.weight ?? 0) || 0;
  return Math.round(totalWeight * 10) / 10;
}

function durationBucket(minutes: number): string {
  if (minutes < 30) return '0-30分钟';
  if (minutes < 60) return '30-60分钟';
  if (minutes < 180) return '1-3小时';
  if (minutes < 360) return '3-6小时';
  if (minutes < 720) return '6-12小时';
  return '12小时+';
}

function failureStage(item: NativeBambuItem): string {
  const progress = Number(item.progress ?? 0) || 0;
  if (progress < 30) return '早期(0-30%)';
  if (progress < 70) return '中期(30-70%)';
  return '后期(70-99%)';
}

// ---------------------------------------------------------------------------
// 核心计算：单周期统计
// ---------------------------------------------------------------------------

function calcPeriodStats(history: NativeBambuItem[]): NativePeriodStats {
  const total = history.length;
  let success = 0, failed = 0, cancelled = 0;
  let totalWeightG = 0, totalDurationMinutes = 0;

  const devices: NativePeriodStats['devices'] = {};
  const filaments: NativePeriodStats['filaments'] = {};
  const monthly: Record<string, number> = {};
  const durationDist: Record<string, number> = {
    '0-30分钟': 0, '30-60分钟': 0, '1-3小时': 0,
    '3-6小时': 0, '6-12小时': 0, '12小时+': 0,
  };
  const failureStageDist: Record<string, number> = {
    '早期(0-30%)': 0, '中期(30-70%)': 0, '后期(70-99%)': 0,
  };
  const nozzleSizeDist: Record<string, number> = {};
  let over500gCount = 0;
  const sliceModeDist: Record<string, number> = {};
  let multiColorCount = 0;

  let longest = { name: '', hours: 0 };
  let shortest = { name: '', hours: Infinity };
  let heaviest = { name: '', weight_g: 0 };
  let lightest = { name: '', weight_g: Infinity };
  let mostColors = { name: '', count: 0 };

  for (const item of history) {
    const status = item.status ?? 0;
    const taskName = item.designTitle ?? item.title ?? '未命名';
    const isCancelled = status === 1 || status === 4;

    if (status === 2) success++;
    else if (status === 3) failed++;
    else if (isCancelled) cancelled++;

    const costSeconds = Number(item.costTime ?? 0) || 0;
    const costMinutes = costSeconds / 60;
    totalDurationMinutes += costMinutes;

    const weight = extractWeight(item);
    if (!isCancelled) totalWeightG += weight;

    // 设备统计
    const deviceName = item.deviceName ?? '未知设备';
    if (!devices[deviceName]) devices[deviceName] = { count: 0, success: 0, failed: 0, weight_g: 0 };
    const dev = devices[deviceName];
    dev.count++;
    if (!isCancelled) dev.weight_g = Math.round((dev.weight_g + weight) * 10) / 10;
    if (status === 2) dev.success++;
    else if (status === 3) dev.failed++;

    // 耗材统计
    const { type: filamentType } = extractFilamentInfo(item);
    if (filamentType) {
      if (!filaments[filamentType]) filaments[filamentType] = { count: 0, weight_g: 0, success: 0, failed: 0 };
      const ft = filaments[filamentType];
      ft.count++;
      if (!isCancelled) ft.weight_g = Math.round((ft.weight_g + weight) * 10) / 10;
      if (status === 2) ft.success++;
      else if (status === 3) ft.failed++;
    }

    // 月度
    const startTime = item.startTime ?? '';
    if (startTime) {
      const monthKey = startTime.slice(0, 7);
      monthly[monthKey] = (monthly[monthKey] ?? 0) + 1;
    }

    // 时长分布
    durationDist[durationBucket(costMinutes)]++;

    // 失败阶段
    if (status === 3 || isCancelled) failureStageDist[failureStage(item)]++;

    // 喷嘴尺寸
    const nSize = (Array.isArray(item.nozzleInfos) && item.nozzleInfos.length > 0 && item.nozzleInfos[0].diameter)
      ? String(item.nozzleInfos[0].diameter)
      : (item.nozzleSize ? String(item.nozzleSize) : '0.4');
    nozzleSizeDist[nSize] = (nozzleSizeDist[nSize] ?? 0) + 1;

    // 超500g
    if (weight > 500) over500gCount++;

    // 切片模式
    const sliceMode = item.mode || 'unknown';
    sliceModeDist[sliceMode] = (sliceModeDist[sliceMode] ?? 0) + 1;

    // 多色
    const colorCount = extractColorsUsed(item).length;
    if (colorCount > 1) multiColorCount++;
    if (colorCount > mostColors.count) mostColors = { name: taskName, count: colorCount };

    // 极值（仅成功记录）
    if (status === 2) {
      const costHours = costMinutes / 60;
      if (costHours > longest.hours) longest = { name: taskName, hours: Math.round(costHours * 10) / 10 };
      if (costHours < shortest.hours && costHours > 0) shortest = { name: taskName, hours: Math.round(costHours * 10) / 10 };
      if (weight > heaviest.weight_g) heaviest = { name: taskName, weight_g: Math.round(weight * 10) / 10 };
      if (weight < lightest.weight_g && weight > 0) lightest = { name: taskName, weight_g: Math.round(weight * 10) / 10 };
    }
  }

  if (shortest.hours === Infinity) shortest = { name: '', hours: 0 };
  if (lightest.weight_g === Infinity) lightest = { name: '', weight_g: 0 };

  const successRate = total > 0 ? Math.round(success / total * 1000) / 10 : 0;
  const totalDurationHours = Math.round(totalDurationMinutes / 60 * 10) / 10;

  return {
    total_prints: total,
    successful_prints: success,
    failed_prints: failed,
    cancelled_prints: cancelled,
    success_rate: successRate,
    total_weight_g: Math.round(totalWeightG * 10) / 10,
    total_duration_hours: totalDurationHours,
    devices,
    filaments,
    monthly,
    duration_distribution: durationDist,
    failure_stage_distribution: failureStageDist,
    extremes: { longest, shortest, heaviest, lightest, most_colors: mostColors },
    nozzle_size_distribution: nozzleSizeDist,
    over_500g_count: over500gCount,
    over_500g_rate: total > 0 ? Math.round(over500gCount / total * 1000) / 10 : 0,
    slice_mode_distribution: sliceModeDist,
    multi_color_count: multiColorCount,
    multi_color_rate: total > 0 ? Math.round(multiColorCount / total * 1000) / 10 : 0,
  };
}

// ---------------------------------------------------------------------------
// 主入口：完整统计结果
// ---------------------------------------------------------------------------

export function calculateNativeStats(records: NativeBambuItem[]): NativeStatsResult {
  const now = new Date();

  function filterByDays(days: number): NativeBambuItem[] {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return records.filter(item => {
      const startTime = item.startTime;
      if (!startTime) return false;
      try { return new Date(startTime) >= cutoff; } catch { return false; }
    });
  }

  const history7d = filterByDays(7);
  const history30d = filterByDays(30);

  const statsLifetime = calcPeriodStats(records);
  const stats7d = calcPeriodStats(history7d);
  const stats30d = calcPeriodStats(history30d);

  // 热力图
  const activityHeatmap: Record<string, number> = {};
  for (const item of records) {
    const dateKey = (item.startTime ?? '').slice(0, 10);
    if (dateKey) activityHeatmap[dateKey] = (activityHeatmap[dateKey] ?? 0) + 1;
  }

  // 耗材成功率
  const filamentSuccessStats: NativeStatsResult['filament_success_stats'] = {};
  for (const item of records) {
    const { type: filamentType } = extractFilamentInfo(item);
    if (!filamentType) continue;
    const status = item.status ?? 0;
    const isCancelled = status === 1 || status === 4;
    const weight = extractWeight(item);

    if (!filamentSuccessStats[filamentType]) {
      filamentSuccessStats[filamentType] = { total: 0, success: 0, failed: 0, cancelled: 0, success_rate: 0, weight_g: 0 };
    }
    const fs = filamentSuccessStats[filamentType];
    fs.total++;
    if (status === 2) fs.success++;
    else if (status === 3) fs.failed++;
    else if (isCancelled) fs.cancelled++;
    if (!isCancelled) fs.weight_g += weight;
  }
  for (const fs of Object.values(filamentSuccessStats)) {
    fs.success_rate = fs.total > 0 ? Math.round(fs.success / fs.total * 1000) / 10 : 0;
    fs.weight_g = Math.round(fs.weight_g * 10) / 10;
  }

  // 颜色使用量
  const colorUsageStats: Record<string, number> = {};
  for (const item of records) {
    const amsList = item.amsDetailMapping;
    if (Array.isArray(amsList)) {
      for (const ams of amsList) {
        if (ams?.sourceColor) {
          const parsed = parseColor(ams.sourceColor);
          if (parsed) {
            const w = Number(ams.weight ?? 0) || 0;
            colorUsageStats[parsed] = Math.round(((colorUsageStats[parsed] ?? 0) + w) * 10) / 10;
          }
        }
      }
    }
  }

  return {
    stats_lifetime: statsLifetime,
    stats_7d: stats7d,
    stats_30d: stats30d,
    activity_heatmap: activityHeatmap,
    filament_success_stats: filamentSuccessStats,
    color_usage_stats: colorUsageStats,
  };
}
