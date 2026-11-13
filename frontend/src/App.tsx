import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
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

const authed = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="keo/moi" element={authed(<PostNewPage />)} />
        <Route path="keo/:id" element={<PostDetailPage />} />
        <Route path="keo-cua-toi" element={authed(<MyPostsPage />)} />
        <Route path="tai-khoan" element={authed(<AccountPage />)} />
        <Route path="tai-khoan/ho-so" element={authed(<ProfilePage />)} />
        <Route path="tai-khoan/doi-mat-khau" element={authed(<ChangePasswordPage />)} />
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
