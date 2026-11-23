import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/**
 * Chặn trang cần đăng nhập.
 * - Chưa đăng nhập / hết phiên → sang /dang-nhap, đăng nhập xong quay lại trang cũ.
 * - Vừa tự bấm "Đăng xuất" → về trang chủ (không bắt đăng nhập lại ngay).
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, justLoggedOut } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) {
    return justLoggedOut ? (
      <Navigate to="/" replace />
    ) : (
      <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />
    );
  }
  return children;
}
