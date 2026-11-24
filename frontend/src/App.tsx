import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import AccountLayout from './components/AccountLayout';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import AccountPage from './pages/AccountPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MyPostsPage from './pages/MyPostsPage';
import NotFoundPage from './pages/NotFoundPage';
import PostDetailPage from './pages/PostDetailPage';
import PostNewPage from './pages/PostNewPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import InvoicePage from './pages/InvoicePage';
import ShuttleStockPage from './pages/ShuttleStockPage';

const authed = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="keo/moi" element={authed(<PostNewPage />)} />
        <Route path="keo/:id" element={<PostDetailPage />} />
        <Route path="keo/:id/hoa-don" element={authed(<InvoicePage />)} />
        {/* Khu tài khoản: dùng chung menu dọc bên trái */}
        <Route element={authed(<AccountLayout />)}>
          <Route path="tai-khoan" element={<AccountPage />} />
          <Route path="tai-khoan/ho-so" element={<ProfilePage />} />
          <Route path="tai-khoan/doi-mat-khau" element={<ChangePasswordPage />} />
          <Route path="keo-cua-toi" element={<MyPostsPage />} />
          <Route path="kho-cau" element={<ShuttleStockPage />} />
        </Route>
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
