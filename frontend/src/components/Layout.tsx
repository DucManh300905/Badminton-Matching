import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Layout() {
  const { user, logout, notice, clearNotice } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-emerald-700">
            <span aria-hidden>🏸</span>
            <span className="hidden sm:inline">Badminton Matching</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Tìm kèo
            </NavLink>
            <NavLink to="/keo/moi" className={navClass}>
              Đăng kèo
            </NavLink>
            {user ? (
              <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="hidden text-sm text-slate-600 sm:inline">
                  Chào, <strong className="text-slate-800">{user.displayName}</strong>
                </span>
                <button type="button" onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <NavLink to="/dang-nhap" className={navClass}>
                Đăng nhập
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {notice && (
          <div className="mb-4">
            <Alert tone="info">
              {notice}{' '}
              <Link to="/dang-nhap" onClick={clearNotice} className="font-semibold underline">
                Đăng nhập lại
              </Link>
            </Alert>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Badminton Matching · Đồ án An Đức Mạnh
      </footer>
    </div>
  );
}
