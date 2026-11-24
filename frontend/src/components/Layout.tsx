import { Link, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../utils/constants';
import Navbar from './Navbar';
import TabBar from './TabBar';
import { Alert } from './ui';

/**
 * Khung chung.
 * Máy tính (từ 1024px): thanh điều hướng trên cùng + nội dung + chân trang (kiểu web).
 * Điện thoại, máy tính bảng: nội dung + thanh tab đáy (kiểu app); Navbar và chân trang ẩn bằng CSS.
 */
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
      <TabBar />
    </div>
  );
}
