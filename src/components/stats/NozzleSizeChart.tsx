/**
 * 喷嘴尺寸分布饼图组件
 */

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyBlock } from './shared';

/** 饼图配色 */
const PIE_COLORS = ['#00E676', '#FFB300', '#FF5252', '#29B6F6', '#AB47BC', '#FF7043', '#26C6DA'];

export default function NozzleSizeChart({ dist }: { dist: Record<string, number> }) {
  const entries = Object.entries(dist);
  if (entries.length === 0) return <EmptyBlock />;

  const data = entries.map(([size, count]) => ({ name: `${size}mm`, value: count }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2D3142', borderRadius: 8, color: '#E8EAED' }} />
        <Legend formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
