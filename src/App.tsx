import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import History from '@/pages/History';
import Stats from '@/pages/Stats';
import Export from '@/pages/Export';
import Settings from '@/pages/Settings';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

/** 占位页面 — 后续替换为实际页面组件 */
function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="font-mono-heading text-2xl font-bold text-[var(--text-primary)]">
        {title}
      </h1>
      <p className="mt-2 text-[var(--text-secondary)]">开发中...</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 登录页 — 无需布局 */}
        <Route path="/login" element={<Login />} />

        {/* 受保护页面 — 需要登录 + 使用 Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<History />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/export" element={<Export />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
