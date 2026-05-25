import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

/** 主布局：左侧导航 + 右侧内容区 */
export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧导航 */}
      <Sidebar />

      {/* 右侧内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部标题栏 — 由子页面通过 <title> 或自定义 header 控制 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
