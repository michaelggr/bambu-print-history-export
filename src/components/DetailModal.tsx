/**
 * 历史记录详情弹窗组件
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import CoverImage from '@/components/CoverImage';
import { formatDateTime, formatDuration, formatWeight, rgbaToHex } from '@/utils/format';
import { formatLength, sliceModeLabel } from '@/utils/history-helpers';
import type { BambuHistoryItem } from '@/types/bambu';

export default function DetailModal({
  record,
  onClose,
}: {
  record: BambuHistoryItem;
  onClose: () => void;
}) {
  const [snapError, setSnapError] = useState(false);
  const title = record.designTitle ?? record.title ?? '未命名';

  // 提取字段
  const nozzleSize = record.nozzleSize ? `${record.nozzleSize}mm`
    : (Array.isArray(record.nozzleInfos) && record.nozzleInfos.length > 0 && record.nozzleInfos[0].diameter
      ? `${record.nozzleInfos[0].diameter}mm` : '-');
  const bedType = record.bedType ?? '-';
  const sliceMode = sliceModeLabel(record.mode);
  const useAms = record.useAms ? '是' : '否';
  const serial = record.deviceId ?? '-';

  // 模型链接 — 使用 designId
  const modelUrl = record.designId
    ? `https://makerworld.com.cn/zh/models/${record.designId}`
    : '';

  // 计算总重量和长度
  let totalWeight = 0;
  let totalLength = 0;
  if (Array.isArray(record.amsDetailMapping)) {
    for (const ams of record.amsDetailMapping) {
      totalWeight += Number(ams.weight ?? 0) || 0;
      totalLength += Number(ams.length ?? 0) || 0;
    }
  }
  if (totalWeight === 0) totalWeight = Number(record.weight ?? 0) || 0;
  if (totalLength === 0) totalLength = Number(record.length ?? 0) || 0;

  /** 字段行 */
  function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex gap-3 py-1.5">
        <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{label}</span>
        <span className="text-sm text-[var(--text-primary)]">{children}</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 弹窗主体 */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题 + 关闭 */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* 图片 + 字段 */}
        <div className="flex gap-6">
          {/* 左侧图片 */}
          <div className="flex shrink-0 flex-col gap-3">
            <CoverImage src={record.cover} alt={title} size={200} />
            {record.snapShot && !snapError && (
              <img
                src={record.snapShot}
                alt="快照"
                className="max-w-[200px] rounded object-contain"
                onError={() => setSnapError(true)}
              />
            )}
          </div>

          {/* 右侧字段 */}
          <div className="flex-1">
            <FieldRow label="任务名称">{title}</FieldRow>
            <FieldRow label="状态"><StatusBadge status={record.status} /></FieldRow>
            <FieldRow label="设备">
              {record.deviceName ?? '-'}
              {record.deviceModel ? ` (${record.deviceModel})` : ''}
            </FieldRow>
            <FieldRow label="开始时间">{formatDateTime(record.startTime ?? '')}</FieldRow>
            <FieldRow label="结束时间">{formatDateTime(record.endTime ?? '')}</FieldRow>
            <FieldRow label="打印时长">{formatDuration(record.costTime ?? 0)}</FieldRow>
            <FieldRow label="耗材重量">{formatWeight(totalWeight)}</FieldRow>
            <FieldRow label="耗材长度">{formatLength(totalLength)}</FieldRow>
            <FieldRow label="喷嘴直径">{nozzleSize}</FieldRow>
            <FieldRow label="热床类型">{bedType}</FieldRow>
            <FieldRow label="切片模式">{sliceMode}</FieldRow>
            <FieldRow label="使用AMS">{useAms}</FieldRow>
            <FieldRow label="设备序列号">{serial}</FieldRow>
            <FieldRow label="多色打印">
              {Array.isArray(record.amsDetailMapping) && record.amsDetailMapping.length > 1 ? '是' : '否'}
            </FieldRow>
            {modelUrl && (
              <FieldRow label="模型链接">
                <a
                  href={modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4FC3F7] underline"
                >
                  {modelUrl}
                </a>
              </FieldRow>
            )}

            {/* AMS 耗材详情 */}
            {Array.isArray(record.amsDetailMapping) && record.amsDetailMapping.length > 0 && (
              <>
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">AMS 耗材详情</span>
                </div>
                {record.amsDetailMapping.map((ams, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-sm">
                    <span className="text-[var(--text-secondary)]">AMS#{i + 1}:</span>
                    <span className="text-[var(--text-primary)]">{ams.filamentType}</span>
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: rgbaToHex(ams.sourceColor) }}
                    />
                    <span className="text-[var(--text-primary)]">{formatWeight(ams.weight)}</span>
                    <span className="text-[var(--text-primary)]">{formatLength(ams.length)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
