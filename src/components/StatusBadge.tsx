import { statusText, statusColor } from '@/utils/format';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: number;
  className?: string;
}

/** 打印状态标签组件 */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        statusColor(status),
        className,
      )}
    >
      {statusText(status)}
    </span>
  );
}
