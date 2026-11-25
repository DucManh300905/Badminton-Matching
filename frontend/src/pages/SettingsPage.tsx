import { useState } from 'react';
import { Link } from 'react-router';
import { toApiError } from '../api/client';
import { usersApi } from '../api/users';
import Icon, { type IconName } from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { Alert, CardTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TAB_BAR, TAB_ITEM_KEYS, featureOf, tabBarOf, type TabItemKey } from '../utils/features';
import { readTheme, saveTheme, THEME_CHOICES, type ThemeChoice } from '../utils/theme';

const THEME_ICONS: Record<ThemeChoice, IconName> = { light: 'sun', dark: 'moon', system: 'monitor' };

function SettingsLink({ to, icon, label, hint }: { to: string; icon: IconName; label: string; hint: string }) {
  return (
    <Link to={to} className="settings-link">
      <span className="icon-chip">
        <Icon name={icon} size={18} />
      </span>
      <span className="settings-link__body">
        <span className="settings-link__label">{label}</span>
        <span className="settings-link__hint">{hint}</span>
      </span>
      <Icon name="chevron" size={18} className="settings-link__chevron" />
    </Link>
  );
}

/** Chế độ sáng / tối: lưu trên thiết bị, áp dụng ngay */
function ThemeCard() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  return (
    <section className="card stack" aria-label="Giao diện">
      <CardTitle icon="sun" className="mt-0">
        Giao diện
      </CardTitle>
      <div className="theme-options" role="radiogroup" aria-label="Chế độ màu">
        {THEME_CHOICES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={choice === t.value}
            className={`theme-option${choice === t.value ? ' theme-option--on' : ''}`}
            onClick={() => {
              setChoice(t.value);
              saveTheme(t.value);
            }}
          >
            <Icon name={THEME_ICONS[t.value]} size={22} />
            {t.label}
          </button>
        ))}
      </div>
      <p className="hint">
        "Theo máy" tự đổi theo chế độ sáng / tối của điện thoại hoặc máy tính. Lưu trên thiết bị này.
      </p>
    </section>
  );
}

/** Chọn 3 tiện ích cho thanh dưới (lưu theo tài khoản) */
function TabBarCard() {
  const { user, setUser } = useAuth();
  const saved = tabBarOf(user?.tabBar);
  const [order, setOrder] = useState<TabItemKey[]>(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const changed = order.join() !== saved.join();
  const full = order.length === 3;

  function toggle(k: TabItemKey) {
    setMessage(null);
    setOrder((o) => (o.includes(k) ? o.filter((x) => x !== k) : o.length < 3 ? [...o, k] : o));
  }

  function move(i: number, d: -1 | 1) {
    setOrder((o) => {
      const n = [...o];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  }

  async function save(items: TabItemKey[] | null) {
    setBusy(true);
    setMessage(null);
    try {
      const u = await usersApi.setTabBar(items);
      setUser(u);
      setOrder(tabBarOf(u.tabBar));
      setMessage({ tone: 'success', text: items ? 'Đã lưu thanh dưới.' : 'Đã khôi phục thanh dưới mặc định.' });
    } catch (e) {
      setMessage({ tone: 'error', text: toApiError(e).message });
    } finally {
      setBusy(false);
    }
  }

  // Xem trước: 2 ô · Đăng kèo · 1 ô · Tổng quan
  const preview: { label: string; icon: IconName; fixed?: boolean }[] = [
    ...order.slice(0, 2).map((k) => ({ label: featureOf(k).short, icon: featureOf(k).icon })),
    { label: 'Đăng kèo', icon: 'plus', fixed: true },
    ...order.slice(2, 3).map((k) => ({ label: featureOf(k).short, icon: featureOf(k).icon })),
    { label: 'Tổng quan', icon: 'grid', fixed: true },
  ];

  return (
    <section className="card stack" aria-label="Thanh dưới">
      <CardTitle icon="grid" className="mt-0">
        Thanh dưới
      </CardTitle>
      <p className="hint">
        Chọn 3 tiện ích hiện ở thanh dưới trên điện thoại. "Đăng kèo" và "Tổng quan" luôn có. Lưu theo tài khoản, đổi
        máy vẫn giữ.
      </p>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="tabbar-preview" aria-label="Xem trước thanh dưới">
        {preview.map((p, i) => (
          <span key={i} className={`tabbar-preview__item${p.fixed ? ' tabbar-preview__item--fixed' : ''}`}>
            <Icon name={p.icon} size={18} />
            {p.label}
          </span>
        ))}
      </div>

      <ul className="tab-picker">
        {TAB_ITEM_KEYS.map((k) => {
          const f = featureOf(k);
          const pos = order.indexOf(k);
          const on = pos >= 0;
          return (
            <li key={k} className={`tab-picker__row${on ? ' tab-picker__row--on' : ''}`}>
              <button
                type="button"
                className="tab-picker__toggle"
                role="checkbox"
                aria-checked={on}
                disabled={!on && full}
                onClick={() => toggle(k)}
              >
                <span className="tab-picker__check" aria-hidden="true">
                  {on ? pos + 1 : ''}
                </span>
                <Icon name={f.icon} size={20} />
                <span>{f.label}</span>
              </button>
              {on && (
                <span className="tab-picker__moves">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Đưa ${f.label} lên trước`}
                    disabled={pos === 0}
                    onClick={() => move(pos, -1)}
                  >
                    <Icon name="arrowUp" size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Đưa ${f.label} ra sau`}
                    disabled={pos === order.length - 1}
                    onClick={() => move(pos, 1)}
                  >
                    <Icon name="arrowDown" size={18} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!full && <p className="hint">Chọn thêm {3 - order.length} tiện ích.</p>}

      <div className="form-footer">
        <button
          type="button"
          className="btn btn--outline"
          disabled={busy || (!user?.tabBar && order.join() === DEFAULT_TAB_BAR.join())}
          onClick={() => save(null)}
        >
          Khôi phục mặc định
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy || !full || !changed}
          onClick={() => save(order)}
        >
          {busy ? 'Đang lưu…' : 'Lưu thanh dưới'}
        </button>
      </div>
    </section>
  );
}

/** Cài đặt (WBS 4.12): hồ sơ, mật khẩu, giao diện sáng / tối, thanh dưới */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt" subtitle="Tài khoản, giao diện và thanh dưới" />
      <div className="stack">
        <section className="card settings-links" aria-label="Tài khoản">
          <SettingsLink
            to="/tai-khoan/ho-so"
            icon="user"
            label="Hồ sơ cá nhân"
            hint="Ảnh đại diện, tên, giới tính, trình độ, tài khoản nhận tiền"
          />
          <SettingsLink
            to="/tai-khoan/doi-mat-khau"
            icon="lock"
            label="Đổi mật khẩu"
            hint="Các máy khác sẽ phải đăng nhập lại"
          />
        </section>
        <ThemeCard />
        <TabBarCard />
      </div>
    </>
  );
}
