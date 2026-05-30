﻿﻿﻿﻿﻿﻿﻿﻿﻿import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import History from '@/pages/History';
import Stats from '@/pages/Stats';
import Export from '@/pages/Export';
import Import from '@/pages/Import';
import Settings from '@/pages/Settings';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import UserAgreement from '@/pages/UserAgreement';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 登录页 — 无需布局 */}
        <Route path="/login" element={<Login />} />

        {/* 公开页面 — 隐私政策和用户协议 */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/user-agreement" element={<UserAgreement />} />

        {/* 受保护页面 — 需要登录 + 使用 Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<History />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/export" element={<Export />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
