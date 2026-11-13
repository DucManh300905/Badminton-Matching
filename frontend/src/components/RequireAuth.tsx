import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** Chặn trang cần đăng nhập; đưa người dùng tới /dang-nhap rồi quay lại trang cũ */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />;
  return children;
}
