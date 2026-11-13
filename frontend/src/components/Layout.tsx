import { Link, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import TabBar from './TabBar';
import { Alert } from './ui';

/** Khung chung: nội dung trang (mỗi trang tự có header xanh) + thanh điều hướng dưới đáy */
export default function Layout() {
  const { notice, clearNotice } = useAuth();

  return (
    <div className="app">
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
      <TabBar />
    </div>
  );
}
