﻿﻿﻿﻿﻿﻿import { View, Text, ScrollView, Picker, Image, Button } from '@tarojs/components';
import { useDidShow, usePullDownRefresh, useShareAppMessage } from '@tarojs/taro';
import { useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';
import { useAppStore } from '@/store';
import { formatDateTime, formatDuration, formatWeight, formatLength, statusText, statusColor, sliceModeLabel, rgbaToHex } from '@/utils/format';
import { applyFilters, paginate, extractDeviceList } from '@/utils/bambu-filter';
import type { BambuHistoryItem } from '@/types/bambu';
import PrinterIcon from '@/components/PrinterIcon';
import './index.scss';

const PAGE_SIZE = 15;

const STATUS_OPTIONS = ['全部', '成功', '失败', '取消'];
const STATUS_VALUES = ['', '2', '3', '1,4'];

function getCoverUrl(item: BambuHistoryItem): string {
  return item.cover || item.snapShot || '';
}

function getTotalWeight(item: BambuHistoryItem): number {
  if (item.amsDetailMapping && item.amsDetailMapping.length > 0) {
    return item.amsDetailMapping.reduce((sum, a) => sum + (a.weight || 0), 0);
  }
  return item.weight || 0;
}

function getTotalLength(item: BambuHistoryItem): number {
  if (item.amsDetailMapping && item.amsDetailMapping.length > 0) {
    return item.amsDetailMapping.reduce((sum, a) => sum + (a.length || 0), 0);
  }
  return item.length || 0;
}

function getNozzleDisplay(item: BambuHistoryItem): string {
  if (item.nozzleSize) return `${item.nozzleSize}mm`;
  if (item.nozzleInfos && item.nozzleInfos.length > 0) {
    return `${item.nozzleInfos[0].diameter}mm`;
  }
  return '-';
}

export default function HistoryPage() {
  const { history, loading, setLoading, loadCachedHistory } = useAppStore();
  const [page, setPage] = useState(1);
  const [statusIdx, setStatusIdx] = useState(0);
  const [deviceIdx, setDeviceIdx] = useState(0);
  const [devices, setDevices] = useState<string[]>([]);
  const [showDetail, setShowDetail] = useState<BambuHistoryItem | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredHistory = useCallback(() => {
    const statusFilter = STATUS_VALUES[statusIdx];
    const deviceFilter = devices.length > 0 && deviceIdx > 0 ? devices[deviceIdx - 1] : '';
    const filters: Record<string, string> = {};
    if (statusFilter) filters.status = statusFilter;
    if (deviceFilter) filters.device = deviceFilter;
    const filtered = applyFilters(history, filters);
    filtered.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));
    return filtered;
  }, [history, statusIdx, deviceIdx, devices]);

  const pagedData = paginate(filteredHistory(), page, PAGE_SIZE);

  const doRefresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    try {
      const res = await api.refreshHistory();
      if (res.success) {
        loadCachedHistory();
        const devs = extractDeviceList(useAppStore.getState().history);
        setDevices(devs);
        const added = res.data?.added ?? 0;
        if (added > 0) {
          Taro.showToast({ title: `新增 ${added} 条记录`, icon: 'success' });
        } else if (showLoading) {
          Taro.showToast({ title: '没有新记录', icon: 'none' });
        }
      }
    } catch (e) {
      console.error('刷新失败:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useDidShow(() => {
    const token = useAppStore.getState().token;
    if (!token) {
      Taro.redirectTo({ url: '/pages/login/index' });
      return;
    }
    loadCachedHistory();
    const cached = useAppStore.getState().history;
    if (cached.length === 0) {
      doRefresh(true);
    } else {
      const devs = extractDeviceList(cached);
      setDevices(devs);
    }
  });

  usePullDownRefresh(() => {
    doRefresh(false).finally(() => Taro.stopPullDownRefresh());
  });

  useShareAppMessage(() => ({
    title: 'Bambu 打印历史 - 查看你的3D打印记录',
    path: '/pages/login/index',
  }));

  const loadMore = () => {
    if (page < pagedData.totalPages) {
      setPage(page + 1);
    } else {
      setHasMore(false);
    }
  };

  const allDisplayItems = page > 1
    ? paginate(filteredHistory(), page, PAGE_SIZE * page).data
    : pagedData.data;

  const detail = showDetail;

  return (
    <View className="history-page">
      <View className="filter-bar">
        <Picker
          mode="selector"
          range={STATUS_OPTIONS}
          value={statusIdx}
          onChange={(e) => { setStatusIdx(Number(e.detail.value)); setPage(1); setHasMore(true); }}
        >
          <View className="filter-chip">
            <Text>{STATUS_OPTIONS[statusIdx]} ▼</Text>
          </View>
        </Picker>

        {devices.length > 0 && (
          <Picker
            mode="selector"
            range={['全部设备', ...devices]}
            value={deviceIdx}
            onChange={(e) => { setDeviceIdx(Number(e.detail.value)); setPage(1); setHasMore(true); }}
          >
            <View className="filter-chip">
              <Text>{deviceIdx === 0 ? '全部设备' : devices[deviceIdx - 1]} ▼</Text>
            </View>
          </Picker>
        )}

        <Text className="total-text">共 {pagedData.total} 条</Text>

        <View className="action-icons">
          <PrinterIcon size={20} />
          <Text className="action-icon" onClick={() => Taro.navigateTo({ url: '/pages/import/index' })}>
            📥
          </Text>
          <Button className="share-btn" openType="share">📤</Button>
        </View>
      </View>

      <ScrollView
        scrollY
        enhanced
        className="history-list"
        onScrollToLower={loadMore}
        lowerThreshold={200}
      >
        {allDisplayItems.length === 0 && !loading ? (
          <View className="empty-state">
            <Text className="empty-icon">📭</Text>
            <Text className="empty-text">暂无打印记录</Text>
            <Text className="empty-hint">下拉刷新或点击 🔄 获取数据</Text>
          </View>
        ) : (
          allDisplayItems.map((item, i) => (
            <View
              key={`${item.id}-${i}`}
              className="history-card"
              onClick={() => setShowDetail(item)}
            >
              {getCoverUrl(item) ? (
                <Image className="card-cover" src={getCoverUrl(item)} mode="aspectFill" />
              ) : null}
              <View className="card-body">
                <View className="card-title-row">
                  <Text className="task-name">{item.designTitle || item.title || '未命名'}</Text>
                  <View className="status-badge" style={{ backgroundColor: statusColor(item.status) + '20' }}>
                    <Text style={{ color: statusColor(item.status), fontSize: '12px' }}>
                      {statusText(item.status)}
                    </Text>
                  </View>
                </View>
                <View className="meta-row">
                  <Text className="meta-item">⏱ {formatDuration(item.costTime || 0)}</Text>
                  <Text className="meta-item">⚖ {formatWeight(getTotalWeight(item))}</Text>
                  {item.deviceName && <Text className="meta-item">🖨 {item.deviceName}</Text>}
                </View>
                <Text className="time-text">📅 {formatDateTime(item.startTime || '')}</Text>
              </View>
            </View>
          ))
        )}
        {loading && <Text className="load-more-text">加载中...</Text>}
        {!hasMore && allDisplayItems.length > 0 && (
          <Text className="load-more-text">— 没有更多了 —</Text>
        )}
      </ScrollView>

      {detail && (
        <View className="detail-mask" onClick={() => setShowDetail(null)}>
          <View className="detail-content" onClick={(e) => e.stopPropagation()}>
            {getCoverUrl(detail) && (
              <Image className="detail-cover" src={getCoverUrl(detail)} mode="aspectFill" />
            )}

            <Text className="detail-title">{detail.designTitle || detail.title || '未命名'}</Text>

            <View className="detail-grid">
              <View className="detail-item">
                <Text className="detail-label">状态</Text>
                <Text style={{ color: statusColor(detail.status) }}>{statusText(detail.status)}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">设备</Text>
                <Text>{detail.deviceName || '-'}{detail.deviceModel ? ` (${detail.deviceModel})` : ''}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">开始时间</Text>
                <Text>{formatDateTime(detail.startTime || '')}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">结束时间</Text>
                <Text>{formatDateTime(detail.endTime || '')}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">打印时长</Text>
                <Text>{formatDuration(detail.costTime || 0)}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">耗材重量</Text>
                <Text>{formatWeight(getTotalWeight(detail))}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">耗材长度</Text>
                <Text>{formatLength(getTotalLength(detail))}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">喷嘴直径</Text>
                <Text>{getNozzleDisplay(detail)}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">热床类型</Text>
                <Text>{detail.bedType || '-'}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">切片模式</Text>
                <Text>{sliceModeLabel(detail.mode)}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">使用AMS</Text>
                <Text>{detail.useAms ? '是' : '否'}</Text>
              </View>
              <View className="detail-item">
                <Text className="detail-label">多色打印</Text>
                <Text>{(detail.amsDetailMapping && detail.amsDetailMapping.length > 1) ? '是' : '否'}</Text>
              </View>
              {detail.deviceId && (
                <View className="detail-item detail-item-full">
                  <Text className="detail-label">设备序列号</Text>
                  <Text className="detail-mono">{detail.deviceId}</Text>
                </View>
              )}
              {detail.designId && (
                <View className="detail-item detail-item-full">
                  <Text className="detail-label">模型链接</Text>
                  <Text
                    className="detail-link"
                    onClick={() => Taro.setClipboardData({
                      data: `https://makerworld.com.cn/zh/models/${detail.designId}`
                    })}
                  >
                    Makerworld #{detail.designId}
                  </Text>
                </View>
              )}
            </View>

            {detail.amsDetailMapping && detail.amsDetailMapping.length > 0 && (
              <View className="ams-section">
                <Text className="ams-title">AMS 耗材详情</Text>
                {detail.amsDetailMapping.map((ams, i) => (
                  <View key={i} className="ams-row">
                    <View className="ams-left">
                      <View
                        className="ams-color-dot"
                        style={{ backgroundColor: rgbaToHex(ams.sourceColor) }}
                      />
                      <Text className="ams-type">AMS#{i + 1} {ams.filamentType}</Text>
                    </View>
                    <View className="ams-right">
                      <Text className="ams-stat">{formatWeight(ams.weight)}</Text>
                      <Text className="ams-stat">{formatLength(ams.length)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View className="detail-close" onClick={() => setShowDetail(null)}>
              <Text>关闭</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
