import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

/** 统计卡片：图标 + 数值 + 标签 */
export default function StatsCard({ icon, value, label, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4',
        'transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--bg-tertiary)]',
        className,
      )}
    >
      {/* 图标区域 */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        {icon}
      </div>
      {/* 数值 + 标签 */}
      <div className="min-w-0 flex-1">
        <p className="font-mono-heading text-xl font-bold text-[var(--text-primary)] break-words">
          {value}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}
