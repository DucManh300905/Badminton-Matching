import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import AccountLayout from './components/AccountLayout';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ChangePasswordPage from './pages/ChangePasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MyPostsPage from './pages/MyPostsPage';
import NotFoundPage from './pages/NotFoundPage';
import PostDetailPage from './pages/PostDetailPage';
import PostNewPage from './pages/PostNewPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import OverviewPage from './pages/OverviewPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import InvoicePage from './pages/InvoicePage';
import ShuttleStockPage from './pages/ShuttleStockPage';

const authed = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

/** Đường dẫn cũ "Kèo của tôi" → "Lịch sử", giữ nguyên ?tab=… */
function OldMyPosts() {
  const { search } = useLocation();
  return <Navigate to={`/lich-su${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="keo/moi" element={authed(<PostNewPage />)} />
        <Route path="keo/:id" element={<PostDetailPage />} />
        <Route path="keo/:id/hoa-don" element={authed(<InvoicePage />)} />
        {/* Tổng quan: mọi tính năng, khách cũng xem được (WBS 4.12) */}
        <Route path="tong-quan" element={<OverviewPage />} />
        <Route path="tai-khoan" element={<Navigate to="/tong-quan" replace />} />
        {/* Khu tài khoản: dùng chung menu dọc bên trái */}
        <Route element={authed(<AccountLayout />)}>
          <Route path="tai-khoan/cai-dat" element={<SettingsPage />} />
          <Route path="tai-khoan/ho-so" element={<ProfilePage />} />
          <Route path="tai-khoan/doi-mat-khau" element={<ChangePasswordPage />} />
          <Route path="lich-su" element={<MyPostsPage />} />
          <Route path="lich-su/tin-nhan/:key" element={<ChatPage />} />
          <Route path="keo-cua-toi" element={<OldMyPosts />} />
          <Route path="kho-cau" element={<ShuttleStockPage />} />
        </Route>
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
