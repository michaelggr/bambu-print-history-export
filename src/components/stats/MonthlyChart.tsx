/**
 * 月度趋势图组件
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { EmptyBlock } from './shared';

export default function MonthlyChart({ monthly }: { monthly: Record<string, number> }) {
  const data = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  if (data.length === 0) return <EmptyBlock />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00E676" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2D3142" />
        <XAxis dataKey="month" stroke="#9AA0A6" tick={{ fontSize: 12 }} />
        <YAxis stroke="#9AA0A6" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#1A1D2E', border: '1px solid #2D3142', borderRadius: 8, color: '#E8EAED' }}
          labelFormatter={(v) => `${v}`}
          formatter={(v: number) => [`${v} 次`, '打印次数']}
        />
        <Area type="monotone" dataKey="count" stroke="#00E676" fill="url(#greenGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
