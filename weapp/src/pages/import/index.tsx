﻿﻿﻿﻿﻿﻿import { View, Text, Button } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';
import { useAppStore } from '@/store';
import type { ImportFormat, ImportResult } from '@/utils/bambu-import';
import { loadExistingIds } from '@/utils/bambu-cache';
import './index.scss';

const FORMAT_LABELS: Record<ImportFormat, { name: string; icon: string }> = {
  json: { name: 'JSON', icon: '📋' },
  csv: { name: 'CSV', icon: '📊' },
  ha: { name: 'HA 插件', icon: '🏠' },
};

export default function ImportPage() {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge');

  const handleChooseFile = () => {
    Taro.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['.json', '.csv', '.ha'],
      success: async (res) => {
        const file = res.tempFiles[0];
        setFileName(file.name);
        setParsing(true);
        setParseResult(null);

        try {
          const fs = Taro.getFileSystemManager();
          const content = fs.readFileSync(file.path, 'utf8') as string;
          const result = await new Promise<ImportResult>((resolve) => {
            resolve(api.importFile(content, 'merge').then(r => {
              if (r.success) {
                return { success: true, format: 'json' as ImportFormat, data: [] } as ImportResult;
              }
              return { success: false, error: r.error || '解析失败' } as ImportResult;
            }));
          });

          const { parseImportFile } = await import('@/utils/bambu-import');
          const parsed = parseImportFile(content);
          setParseResult(parsed);
        } catch (e: any) {
          setParseResult({ success: false, error: e.message || '读取文件失败' });
        } finally {
          setParsing(false);
        }
      },
      fail: () => {},
    });
  };

  const handleImport = async () => {
    if (!parseResult || !parseResult.success) return;

    if (mode === 'overwrite') {
      const { confirm } = await Taro.showModal({
        title: '确认覆盖',
        content: '覆盖操作将清除当前所有历史数据，且不可撤销！',
        confirmColor: '#FF6B6B',
      });
      if (!confirm) return;
    }

    setImporting(true);
    try {
      const content = JSON.stringify(parseResult.data);
      const res = await api.importFile(content, mode);
      if (res.success && res.data) {
        useAppStore.getState().loadCachedHistory();
        const data = res.data as any;
        const msg = mode === 'merge'
          ? `新增 ${data.added} 条，跳过 ${data.skipped} 条，共 ${data.total} 条`
          : `已导入 ${data.total} 条记录`;
        Taro.showToast({ title: msg, icon: 'success', duration: 2000 });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.error || '导入失败', icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '导入失败', icon: 'none' });
    } finally {
      setImporting(false);
    }
  };

  const existingIds = loadExistingIds();
  const estimatedNew = parseResult?.success
    ? parseResult.data.filter(item => !existingIds.has(String(item.id ?? ''))).length
    : 0;

  return (
    <View className="import-page">
      <View className="section">
        <Text className="section-title">选择文件</Text>
        <Text className="section-desc">支持 .json / .csv / .ha 格式</Text>
        <Button className="choose-btn" onClick={handleChooseFile} loading={parsing}>
          {parsing ? '解析中...' : '选择文件'}
        </Button>
        {fileName && <Text className="file-name">📄 {fileName}</Text>}
      </View>

      {parseResult?.success && (
        <View className="section">
          <Text className="section-title">解析结果</Text>
          <View className="result-card">
            <Text className="format-badge">
              {FORMAT_LABELS[parseResult.format].icon} {FORMAT_LABELS[parseResult.format].name}
            </Text>
            <Text className="result-count">包含 {parseResult.data.length} 条记录</Text>
            {mode === 'merge' && (
              <Text className="result-estimate">预计新增 {estimatedNew} 条</Text>
            )}
          </View>

          <View className="mode-section">
            <Text className="mode-title">导入模式</Text>
            <View className="mode-options">
              <View
                className={`mode-option ${mode === 'merge' ? 'active' : ''}`}
                onClick={() => setMode('merge')}
              >
                <View className="mode-radio">
                  {mode === 'merge' && <View className="radio-inner" />}
                </View>
                <View className="mode-info">
                  <Text className="mode-label">增量合并</Text>
                  <Text className="mode-desc">按 ID 去重，追加新记录</Text>
                </View>
              </View>
              <View
                className={`mode-option ${mode === 'overwrite' ? 'active' : ''}`}
                onClick={() => setMode('overwrite')}
              >
                <View className="mode-radio">
                  {mode === 'overwrite' && <View className="radio-inner" />}
                </View>
                <View className="mode-info">
                  <Text className="mode-label danger">覆盖替换</Text>
                  <Text className="mode-desc">清除现有数据，完全替换</Text>
                </View>
              </View>
            </View>
          </View>

          <Button
            className="import-btn"
            loading={importing}
            onClick={handleImport}
          >
            {mode === 'merge' ? `合并导入 (${estimatedNew} 条新)` : '覆盖导入'}
          </Button>
        </View>
      )}

      {parseResult && !parseResult.success && (
        <View className="section error-section">
          <Text className="error-icon">❌</Text>
          <Text className="error-text">{parseResult.error}</Text>
        </View>
      )}
    </View>
  );
}
