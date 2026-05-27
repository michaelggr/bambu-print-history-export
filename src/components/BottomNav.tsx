import { NavLink } from 'react-router-dom';
import { History, BarChart3, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: History, label: '历史' },
  { to: '/stats', icon: BarChart3, label: '统计' },
  { to: '/export', icon: Download, label: '导出' },
  { to: '/settings', icon: Settings, label: '设置' },
];

/** 手机端底部导航栏 */
export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* 手机端 Logo */}
      <div className="flex flex-col items-center gap-0.5 px-3 py-1">
        <img src="/logo.webp" alt="Logo" className="h-6 w-6 rounded-md object-cover" />
      </div>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors',
              isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
            )
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
