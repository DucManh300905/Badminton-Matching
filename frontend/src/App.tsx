import { Route, Routes } from 'react-router';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PostDetailPage from './pages/PostDetailPage';
import PostNewPage from './pages/PostNewPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="keo/moi"
          element={
            <RequireAuth>
              <PostNewPage />
            </RequireAuth>
          }
        />
        <Route path="keo/:id" element={<PostDetailPage />} />
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
