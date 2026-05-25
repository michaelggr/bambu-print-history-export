import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { isNative } from '@/utils/platform';

/** 主布局：桌面端左侧导航 + 右侧内容区，手机端底部导航 */
export default function Layout() {
  const native = isNative();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面端左侧导航 — 手机端隐藏 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 右侧内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className={`flex-1 overflow-y-auto ${native ? 'p-3' : 'p-4 md:p-6'}`}>
          <Outlet />
        </main>
      </div>

      {/* 手机端底部导航 — 桌面端隐藏 */}
      <div className="block md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
