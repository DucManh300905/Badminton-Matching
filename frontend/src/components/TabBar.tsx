import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { featureOf, tabBarOf } from '../utils/features';
import { toDateInput } from '../utils/format';
import { activeTab, type TabKey } from '../utils/nav';
import Icon, { type IconName } from './Icon';
import { CountBadge } from './ui';

interface Tab {
  key: TabKey;
  label: string;
  icon: IconName;
  to: string;
}

/**
 * Thanh tab đáy kiểu app, CHỈ hiện trên điện thoại và máy tính bảng (dưới 1024px).
 * 2 ô tự chọn · nút "Đăng kèo" nổi ở giữa · 1 ô tự chọn · "Tổng quan" (WBS 4.12).
 * 3 ô tự chọn lưu theo tài khoản (Cài đặt → Thanh dưới); chưa chọn / chưa đăng nhập thì dùng mặc định.
 */
export default function TabBar() {
  const { user } = useAuth();
  const { unread } = useChat();
  const { pathname } = useLocation();
  // Ngày hôm nay (đường dẫn của một số tiện ích có thể cần)
  const [today] = useState(() => toDateInput(new Date()));
  const current = activeTab(pathname);

  const [a, b, c] = tabBarOf(user?.tabBar).map((k) => {
    const f = featureOf(k);
    return { key: k, label: f.short, icon: f.icon, to: f.to(today) } as Tab;
  });
  const tabs: Tab[] = [
    a,
    b,
    { key: 'new', label: 'Đăng kèo', icon: 'plus', to: '/keo/moi' },
    c,
    { key: 'overview', label: 'Tổng quan', icon: 'grid', to: '/tong-quan' },
  ];
  // Trang của một tiện ích không có trên thanh (vd Kho cầu khi chưa chọn) → sáng ô "Tổng quan"
  const active = current && tabs.some((t) => t.key === current) ? current : current ? 'overview' : null;

  // Trang trò chuyện dùng toàn màn hình cho khung nhập tin
  if (pathname.startsWith('/lich-su/tin-nhan/')) return null;

  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const className = `tab${tab.key === 'new' ? ' tab--center' : ''}${isActive ? ' tab--active' : ''}`;
        return (
          <Link key={tab.key} to={tab.to} className={className} aria-current={isActive ? 'page' : undefined}>
            {tab.key === 'new' ? (
              <span className="tab__fab">
                <Icon name={tab.icon} size={28} />
              </span>
            ) : (
              <span className="tab__icon">
                <Icon name={tab.icon} size={24} />
                {tab.key === 'mine' && <CountBadge count={unread} className="count-dot--tab" />}
              </span>
            )}
            <span className="tab__label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
