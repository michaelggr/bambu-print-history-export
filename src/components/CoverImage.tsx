/**
 * 封面缩略图组件 — 无图时显示占位图标
 */

import { useState } from 'react';
import { Box } from 'lucide-react';

export default function CoverImage({ src, alt, size = 40 }: { src?: string; alt: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div
        className="flex items-center justify-center rounded bg-[var(--bg-tertiary)]"
        style={{ width: size, height: size }}
      >
        <Box size={size * 0.45} className="text-[var(--text-muted)]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="rounded object-cover"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
