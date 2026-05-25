import { NavLink, useNavigate } from 'react-router-dom';
import { History, BarChart3, Download, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import useAppStore from '@/store';

/** 导航项配置 */
const navItems = [
  { to: '/', icon: History, label: '历史记录' },
  { to: '/stats', icon: BarChart3, label: '分析统计' },
  { to: '/export', icon: Download, label: '数据导出' },
  { to: '/settings', icon: Settings, label: '系统设置' },
];

/** 侧边导航栏 */
export default function Sidebar() {
  const clearAuth = useAppStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className="flex h-screen w-[200px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* 顶部 Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <History size={18} />
        </div>
        <span className="font-mono-heading text-sm font-bold text-[var(--text-primary)]">
          Bambu
        </span>
      </div>

      {/* 导航列表 */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-l-2 border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部登出 */}
      <div className="border-t border-[var(--border)] p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
        >
          <LogOut size={18} />
          <span>登出</span>
        </button>
      </div>
    </aside>
  );
}
