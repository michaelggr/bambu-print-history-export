﻿﻿﻿﻿﻿﻿import { View, Text, Button, Picker } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';
import { useAppStore } from '@/store';
import { extractDeviceList } from '@/utils/bambu-filter';
import type { FilterParams } from '@/utils/bambu-filter';
import PrinterIcon from '@/components/PrinterIcon';
import './index.scss';

type ExportFormat = 'json' | 'csv' | 'ha';

const FORMAT_OPTIONS: { key: ExportFormat; label: string; desc: string }[] = [
  { key: 'json', label: 'JSON', desc: '原始数据格式，适合开发者' },
  { key: 'csv', label: 'CSV', desc: '表格格式，可用 Excel 打开' },
  { key: 'ha', label: 'HA 插件', desc: 'Home Assistant printer_analytics 格式' },
];

const STATUS_OPTIONS = ['全部', '仅成功', '仅失败'];
const STATUS_VALUES: (string | undefined)[] = [undefined, '2', '3'];

export default function ExportPage() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [deviceIdx, setDeviceIdx] = useState(0);
  const [devices, setDevices] = useState<string[]>([]);
  const { history } = useAppStore();

  if (devices.length === 0 && history.length > 0) {
    setDevices(extractDeviceList(history));
  }

  const buildFilters = (): FilterParams => {
    const filters: FilterParams = {};
    const statusFilter = STATUS_VALUES[statusIdx];
    if (statusFilter) filters.status = statusFilter;
    if (devices.length > 0 && deviceIdx > 0) filters.device = devices[deviceIdx - 1];
    return filters;
  };

  const handleExport = async () => {
    if (history.length === 0) {
      Taro.showToast({ title: '暂无数据可导出', icon: 'none' });
      return;
    }
    setExporting(true);
    try {
      const filters = buildFilters();
      const res = await api.exportData(format, Object.keys(filters).length > 0 ? filters : undefined);
      if (res.success && res.data) {
        const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
        const fs = Taro.getFileSystemManager();
        const ext = format === 'csv' ? 'csv' : 'json';
        const fileName = `bambu-export-${Date.now()}.${ext}`;
        const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;
        fs.writeFileSync(filePath, content, 'utf8');

        Taro.showToast({ title: '导出成功', icon: 'success' });

        setTimeout(() => {
          Taro.shareFileMessage({
            filePath,
            fileName,
            success: () => {},
            fail: () => {
              Taro.showModal({
                title: '导出完成',
                content: `文件已保存: ${fileName}\n数据量: ${history.length} 条`,
                showCancel: false,
              });
            },
          });
        }, 500);
      } else {
        Taro.showToast({ title: res.error || '导出失败', icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '导出失败', icon: 'none' });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (history.length === 0) {
      Taro.showToast({ title: '暂无数据可分享', icon: 'none' });
      return;
    }
    try {
      await api.shareExport(format);
    } catch (e: any) {
      Taro.showToast({ title: e.message || '分享失败', icon: 'none' });
    }
  };

  const handleFullDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.fullDownload();
      if (res.success && res.data) {
        useAppStore.getState().loadCachedHistory();
        Taro.showToast({ title: `已下载 ${res.data.total} 条记录`, icon: 'success' });
      } else {
        Taro.showToast({ title: res.error || '下载失败', icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '下载失败', icon: 'none' });
    } finally {
      setDownloading(false);
    }
  };

  const handleIncrementalRefresh = async () => {
    setDownloading(true);
    try {
      const res = await api.refreshHistory();
      if (res.success) {
        useAppStore.getState().loadCachedHistory();
        const added = res.data?.added ?? 0;
        Taro.showToast({
          title: added > 0 ? `新增 ${added} 条记录` : '没有新记录',
          icon: added > 0 ? 'success' : 'none',
        });
      } else {
        Taro.showToast({ title: res.error || '刷新失败', icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '刷新失败', icon: 'none' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View className="export-page">
      <View className="section">
        <View className="section-header">
          <Text className="section-title">数据同步</Text>
          <PrinterIcon size={28} />
        </View>
        <Text className="section-desc">从 Bambu Cloud 获取打印记录</Text>
        <View className="btn-group">
          <Button
            className="action-btn primary"
            loading={downloading}
            onClick={handleIncrementalRefresh}
          >
            增量更新
          </Button>
          <Button
            className="action-btn"
            loading={downloading}
            onClick={handleFullDownload}
          >
            全量下载
          </Button>
        </View>
      </View>

      <View className="section">
        <View className="section-header">
          <Text className="section-title">选择导出格式</Text>
        </View>
        {FORMAT_OPTIONS.map(opt => (
          <View
            key={opt.key}
            className={`format-option ${format === opt.key ? 'active' : ''}`}
            onClick={() => setFormat(opt.key)}
          >
            <View className="format-radio">
              {format === opt.key && <View className="radio-inner" />}
            </View>
            <View className="format-info">
              <Text className="format-label">{opt.label}</Text>
              <Text className="format-desc">{opt.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="section">
        <Text className="section-title">筛选条件（可选）</Text>
        <View className="filter-group">
          <Text className="filter-label">状态</Text>
          <Picker
            mode="selector"
            range={STATUS_OPTIONS}
            value={statusIdx}
            onChange={(e) => setStatusIdx(Number(e.detail.value))}
          >
            <View className="filter-chip">
              <Text>{STATUS_OPTIONS[statusIdx]} ▼</Text>
            </View>
          </Picker>
        </View>
        {devices.length > 0 && (
          <View className="filter-group">
            <Text className="filter-label">设备</Text>
            <Picker
              mode="selector"
              range={['全部', ...devices]}
              value={deviceIdx}
              onChange={(e) => setDeviceIdx(Number(e.detail.value))}
            >
              <View className="filter-chip">
                <Text>{deviceIdx === 0 ? '全部' : devices[deviceIdx - 1]} ▼</Text>
              </View>
            </Picker>
          </View>
        )}
      </View>

      <View className="export-info">
        <Text className="info-text">当前缓存 {history.length} 条记录</Text>
      </View>

      <View className="btn-group-vertical">
        <Button
          className="export-btn"
          type="primary"
          loading={exporting}
          disabled={history.length === 0}
          onClick={handleExport}
        >
          导出数据
        </Button>
        <Button
          className="share-action-btn"
          disabled={history.length === 0}
          onClick={handleShare}
        >
          分享给好友
        </Button>
      </View>
    </View>
  );
}
