import { Navigate, Outlet } from 'react-router-dom';
import useAppStore from '@/store';

/** 路由守卫：未登录则重定向到 /login */
export default function ProtectedRoute() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
