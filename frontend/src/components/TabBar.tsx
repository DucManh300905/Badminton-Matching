import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { toDateInput } from '../utils/format';
import { activeTab, type TabKey } from '../utils/nav';
import Icon, { type IconName } from './Icon';

interface Tab {
  key: TabKey;
  label: string;
  icon: IconName;
  to: (today: string) => string;
}

// 2 tab · nút giữa · 2 tab
const TABS: Tab[] = [
  { key: 'search', label: 'Tìm kèo', icon: 'search', to: () => '/' },
  { key: 'today', label: 'Hôm nay', icon: 'clock', to: (today) => `/?date=${today}` },
  { key: 'new', label: 'Đăng kèo', icon: 'plus', to: () => '/keo/moi' },
  { key: 'mine', label: 'Kèo của tôi', icon: 'calendar', to: () => '/keo-cua-toi' },
  { key: 'account', label: 'Tài khoản', icon: 'user', to: () => '/tai-khoan' },
];

export default function TabBar() {
  const { pathname, search } = useLocation();
  // Lấy ngày một lần khi mở app (đủ dùng cho nút "Hôm nay")
  const [today] = useState(() => toDateInput(new Date()));
  const active = activeTab(pathname, search, today);

  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const className = `tab${tab.key === 'new' ? ' tab--center' : ''}${isActive ? ' tab--active' : ''}`;
        return (
          <Link key={tab.key} to={tab.to(today)} className={className} aria-current={isActive ? 'page' : undefined}>
            {tab.key === 'new' ? (
              <span className="tab__fab">
                <Icon name={tab.icon} size={30} />
              </span>
            ) : (
              <Icon name={tab.icon} size={26} />
            )}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
