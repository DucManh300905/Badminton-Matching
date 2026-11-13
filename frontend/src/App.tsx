import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostNewPage } from './pages/PostNewPage'
import { RegisterPage } from './pages/RegisterPage'

function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl">🏸</p>
      <h1 className="mt-4 text-xl font-bold">Không tìm thấy trang</h1>
      <Link to="/" className="mt-4 inline-block text-emerald-700 hover:underline">
        Về trang chủ
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  )
}
