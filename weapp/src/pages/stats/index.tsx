﻿﻿﻿﻿﻿﻿import { View, Text, ScrollView } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';
import { useAppStore } from '@/store';
import { formatWeight, formatDuration } from '@/utils/format';
import type { PeriodStats, StatsResult } from '@/types/bambu';
import './index.scss';

type PeriodKey = 'lifetime' | '7d' | '30d';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  lifetime: '终身', '7d': '7天', '30d': '30天',
};

function getPeriod(stats: StatsResult | null, key: PeriodKey): PeriodStats | null {
  if (!stats) return null;
  if (key === 'lifetime') return stats.stats_lifetime;
  if (key === '7d') return stats.stats_7d;
  return stats.stats_30d;
}

function fmtHours(h: number): string {
  if (!h || h <= 0) return '-';
  if (h >= 24) return `${(h / 24).toFixed(1)}天`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.round(h * 60)}m`;
}

function sliceModeLabel(mode: string): string {
  if (mode === 'cloud_slice') return '云端';
  if (mode === 'local') return '本地';
  return mode || '未知';
}

export default function StatsPage() {
  const { history } = useAppStore();
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('lifetime');
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    const token = useAppStore.getState().token;
    if (!token) { Taro.redirectTo({ url: '/pages/login/index' }); return; }
    loadStats();
  });

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getStats();
      if (res.success && res.data) setStats(res.data);
    } finally {
      setLoading(false);
    }
  };

  const current = getPeriod(stats, period);
  const life = stats?.stats_lifetime;
  const s7 = stats?.stats_7d;
  const s30 = stats?.stats_30d;

  return (
    <View className="stats-page">
      <View className="period-tabs">
        {(['lifetime', '7d', '30d'] as PeriodKey[]).map(key => (
          <View
            key={key}
            className={`tab-item ${period === key ? 'active' : ''}`}
            onClick={() => setPeriod(key)}
          >
            <Text>{PERIOD_LABELS[key]}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY enhanced className="stats-scroll">
        {loading ? (
          <Text className="loading-text">加载中...</Text>
        ) : current && life && s7 && s30 ? (
          <>
            {/* 概览卡片 */}
            <View className="stats-cards">
              <View className="stat-card">
                <Text className="stat-value">{current.total_prints}</Text>
                <Text className="stat-label">总打印</Text>
              </View>
              <View className="stat-card">
                <Text className="stat-value" style={{ color: '#52c41a' }}>{current.success_rate}%</Text>
                <Text className="stat-label">成功率</Text>
              </View>
              <View className="stat-card">
                <Text className="stat-value">{formatWeight(current.total_weight_g)}</Text>
                <Text className="stat-label">总耗材</Text>
              </View>
              <View className="stat-card">
                <Text className="stat-value">{fmtHours(current.total_duration_hours)}</Text>
                <Text className="stat-label">总时长</Text>
              </View>
              <View className="stat-card">
                <Text className="stat-value">{Object.keys(current.devices).length}</Text>
                <Text className="stat-label">设备数</Text>
              </View>
              <View className="stat-card">
                <Text className="stat-value">{Object.keys(current.filaments).length}</Text>
                <Text className="stat-label">耗材类型</Text>
              </View>
            </View>

            {/* 周期对比表 */}
            <View className="section">
              <Text className="section-title">周期对比</Text>
              <View className="compare-table">
                <View className="compare-header">
                  <Text className="compare-cell label-cell">指标</Text>
                  <Text className="compare-cell">7天</Text>
                  <Text className="compare-cell">30天</Text>
                  <Text className="compare-cell">终身</Text>
                </View>
                {[
                  { label: '打印次数', v7: s7.total_prints, v30: s30.total_prints, vl: life.total_prints },
                  { label: '成功率', v7: `${s7.success_rate}%`, v30: `${s30.success_rate}%`, vl: `${life.success_rate}%` },
                  { label: '总耗材', v7: formatWeight(s7.total_weight_g), v30: formatWeight(s30.total_weight_g), vl: formatWeight(life.total_weight_g) },
                  { label: '总时长', v7: fmtHours(s7.total_duration_hours), v30: fmtHours(s30.total_duration_hours), vl: fmtHours(life.total_duration_hours) },
                ].map(row => (
                  <View key={row.label} className="compare-row">
                    <Text className="compare-cell label-cell">{row.label}</Text>
                    <Text className="compare-cell">{String(row.v7)}</Text>
                    <Text className="compare-cell">{String(row.v30)}</Text>
                    <Text className="compare-cell">{String(row.vl)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 打印状态 */}
            <View className="section">
              <Text className="section-title">打印状态</Text>
              <View className="status-row">
                <View className="status-item success">
                  <Text className="status-num">{current.successful_prints}</Text>
                  <Text className="status-label">成功</Text>
                </View>
                <View className="status-item failed">
                  <Text className="status-num">{current.failed_prints}</Text>
                  <Text className="status-label">失败</Text>
                </View>
                <View className="status-item cancelled">
                  <Text className="status-num">{current.cancelled_prints}</Text>
                  <Text className="status-label">取消</Text>
                </View>
              </View>
            </View>

            {/* 设备分布 */}
            <View className="section">
              <Text className="section-title">设备分布</Text>
              {Object.entries(current.devices).map(([name, dev]) => (
                <View key={name} className="device-row">
                  <Text className="device-name">{name}</Text>
                  <View className="device-stats">
                    <Text>{dev.count}次</Text>
                    <Text style={{ color: '#52c41a' }}>成功{dev.success}</Text>
                    <Text style={{ color: '#ff4d4f' }}>失败{dev.failed}</Text>
                    <Text>{formatWeight(dev.weight_g)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 耗材统计 */}
            <View className="section">
              <Text className="section-title">耗材统计</Text>
              {stats.filament_success_stats && Object.entries(stats.filament_success_stats)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 15)
                .map(([name, fil]) => (
                  <View key={name} className="filament-row">
                    <View className="filament-left">
                      <Text className="filament-name">{name}</Text>
                      <Text className="filament-rate" style={{ color: fil.success_rate >= 80 ? '#52c41a' : fil.success_rate >= 50 ? '#faad14' : '#ff4d4f' }}>
                        {fil.success_rate}%
                      </Text>
                    </View>
                    <View className="filament-right">
                      <Text>{fil.count}次</Text>
                      <Text>{formatWeight(fil.weight_g)}</Text>
                      <Text style={{ color: '#52c41a' }}>✓{fil.success}</Text>
                      <Text style={{ color: '#ff4d4f' }}>✗{fil.failed}</Text>
                    </View>
                  </View>
                ))}
            </View>

            {/* 月度趋势 */}
            <View className="section">
              <Text className="section-title">月度趋势</Text>
              {(() => {
                const months = Object.entries(current.monthly)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(-12);
                const maxVal = Math.max(...months.map(([, v]) => v), 1);
                return months.map(([month, count]) => (
                  <View key={month} className="bar-row">
                    <Text className="bar-label">{month.slice(2)}</Text>
                    <View className="bar-track">
                      <View className="bar-fill" style={{ width: `${(count / maxVal) * 100}%` }} />
                    </View>
                    <Text className="bar-count">{count}</Text>
                  </View>
                ));
              })()}
            </View>

            {/* 活动热力图 */}
            <View className="section">
              <Text className="section-title">活动热力图</Text>
              {(() => {
                const heatmap = stats.activity_heatmap || {};
                const dates = Object.keys(heatmap).sort();
                if (dates.length === 0) return <Text className="hint-text">暂无数据</Text>;
                const maxCount = Math.max(...Object.values(heatmap), 1);
                const recent = dates.slice(-90);
                return (
                  <View className="heatmap-grid">
                    {recent.map(date => {
                      const count = heatmap[date] || 0;
                      const intensity = count / maxCount;
                      const bg = count === 0 ? '#f0f0f0'
                        : intensity < 0.25 ? '#c6e48b'
                        : intensity < 0.5 ? '#7bc96f'
                        : intensity < 0.75 ? '#239a3b'
                        : '#196127';
                      return (
                        <View key={date} className="heatmap-cell" style={{ backgroundColor: bg }}>
                          <Text className="heatmap-tip">{date.slice(5)}: {count}次</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>

            {/* 打印参数分析 */}
            <View className="section">
              <Text className="section-title">打印参数分析</Text>
              {/* 喷嘴尺寸分布 */}
              <Text className="sub-title">喷嘴尺寸分布</Text>
              {Object.entries(current.nozzle_size_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([size, count]) => (
                  <View key={size} className="param-row">
                    <Text className="param-label">{size}mm</Text>
                    <View className="param-bar-bg">
                      <View className="param-bar" style={{ width: `${(count / current.total_prints) * 100}%` }} />
                    </View>
                    <Text className="param-count">{count}</Text>
                  </View>
                ))}
              {/* 切片模式分布 */}
              <Text className="sub-title" style={{ marginTop: 12 }}>切片模式分布</Text>
              {Object.entries(current.slice_mode_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([mode, count]) => (
                  <View key={mode} className="param-row">
                    <Text className="param-label">{sliceModeLabel(mode)}</Text>
                    <View className="param-bar-bg">
                      <View className="param-bar mode-bar" style={{ width: `${(count / current.total_prints) * 100}%` }} />
                    </View>
                    <Text className="param-count">{count}</Text>
                  </View>
                ))}
            </View>

            {/* 模型特征占比 */}
            <View className="section">
              <Text className="section-title">模型特征占比</Text>
              <View className="rate-row">
                <View className="rate-card">
                  <Text className="rate-value">{current.over_500g_rate}%</Text>
                  <Text className="rate-label">超500g模型</Text>
                  <Text className="rate-detail">{current.over_500g_count}/{current.total_prints}</Text>
                </View>
                <View className="rate-card">
                  <Text className="rate-value">{current.multi_color_rate}%</Text>
                  <Text className="rate-label">多色模型</Text>
                  <Text className="rate-detail">{current.multi_color_count}/{current.total_prints}</Text>
                </View>
              </View>
            </View>

            {/* 颜色使用量对比 */}
            {stats.color_usage_stats && Object.keys(stats.color_usage_stats).length > 0 && (
              <View className="section">
                <Text className="section-title">颜色使用量对比</Text>
                {(() => {
                  const maxWeight = Math.max(...Object.values(stats.color_usage_stats), 1);
                  return Object.entries(stats.color_usage_stats)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 15)
                    .map(([color, weight]) => (
                      <View key={color} className="color-row">
                        <View className="color-dot" style={{ backgroundColor: color }} />
                        <View className="color-bar-bg">
                          <View className="color-bar" style={{ width: `${(weight / maxWeight) * 100}%`, backgroundColor: color }} />
                        </View>
                        <Text className="color-weight">{formatWeight(weight)}</Text>
                      </View>
                    ));
                })()}
              </View>
            )}

            {/* 时长分布 */}
            <View className="section">
              <Text className="section-title">时长分布</Text>
              {Object.entries(current.duration_distribution)
                .filter(([, v]) => v > 0)
                .map(([bucket, count]) => (
                  <View key={bucket} className="dist-row">
                    <Text className="dist-label">{bucket}</Text>
                    <View className="dist-bar-bg">
                      <View
                        className="dist-bar"
                        style={{ width: `${Math.min(100, (count / current.total_prints) * 100)}%` }}
                      />
                    </View>
                    <Text className="dist-count">{count}</Text>
                  </View>
                ))}
            </View>

            {/* 之最统计 */}
            {current.extremes && (
              <View className="section">
                <Text className="section-title">之最统计</Text>
                {[
                  { label: '最长打印', name: current.extremes.longest.name, value: fmtHours(current.extremes.longest.hours) },
                  { label: '最短打印', name: current.extremes.shortest.name, value: fmtHours(current.extremes.shortest.hours) },
                  { label: '最重打印', name: current.extremes.heaviest.name, value: formatWeight(current.extremes.heaviest.weight_g) },
                  { label: '最轻打印', name: current.extremes.lightest.name, value: formatWeight(current.extremes.lightest.weight_g) },
                  { label: '最多颜色', name: current.extremes.most_colors.name, value: `${current.extremes.most_colors.count}色` },
                ].map(item => (
                  <View key={item.label} className="extreme-item">
                    <Text className="extreme-label">{item.label}</Text>
                    <Text className="extreme-value">{item.name} ({item.value})</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 失败阶段分布 */}
            {current.failure_stage_distribution && (
              <View className="section">
                <Text className="section-title">失败阶段分布</Text>
                {Object.entries(current.failure_stage_distribution)
                  .filter(([, v]) => v > 0)
                  .map(([stage, count]) => (
                    <View key={stage} className="dist-row">
                      <Text className="dist-label">{stage}</Text>
                      <View className="dist-bar-bg">
                        <View className="dist-bar fail-bar" style={{ width: `${Math.min(100, (count / (current.failed_prints + current.cancelled_prints || 1)) * 100)}%` }} />
                      </View>
                      <Text className="dist-count">{count}</Text>
                    </View>
                  ))}
              </View>
            )}
          </>
        ) : (
          <View className="empty-state">
            <Text className="empty-text">暂无统计数据</Text>
            <Text className="empty-hint">请先在历史页获取数据</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
