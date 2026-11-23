import { Link, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../utils/constants';
import Navbar from './Navbar';
import { Alert } from './ui';

/** Khung chung: thanh điều hướng trên cùng + nội dung trang + chân trang */
export default function Layout() {
  const { notice, clearNotice } = useAuth();

  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <div className="container">
          {notice && (
            <div className="notice">
              <Alert tone="info">
                {notice}{' '}
                <Link to="/dang-nhap" onClick={clearNotice}>
                  Đăng nhập lại
                </Link>
              </Alert>
            </div>
          )}
          <Outlet />
        </div>
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <span>Badminton Matching · Đồ án An Đức Mạnh (MSSV 23110310)</span>
          <span>Phiên bản {APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
