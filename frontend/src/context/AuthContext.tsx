import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/client';
import { usersApi } from '../api/users';
import type { RegisterInput, User } from '../types';

interface AuthState {
  user: User | null;
  /** true trong lúc đang hỏi server "tôi là ai" khi mới mở trang */
  loading: boolean;
  /** Thông báo khi phiên đăng nhập hết hạn giữa chừng */
  notice: string | null;
  clearNotice: () => void;
  /** true ngay sau khi người dùng TỰ bấm đăng xuất → trang cần đăng nhập chuyển về trang chủ, không sang trang Đăng nhập */
  justLoggedOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  /** Cập nhật user sau khi sửa hồ sơ */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Có token thì phải hỏi server trước khi biết đã đăng nhập hay chưa
  const [loading, setLoading] = useState(() => !!tokenStore.get());
  const [notice, setNotice] = useState<string | null>(null);
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) return;
    usersApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // client.ts phát sự kiện này khi server trả 401 cho request có token
  useEffect(() => {
    const onUnauthorized = () => {
      setUser((current) => {
        if (current) setNotice('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
        return null;
      });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    tokenStore.set(result.token);
    setUser(result.user);
    setNotice(null);
    setJustLoggedOut(false);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    tokenStore.set(result.token);
    setUser(result.user);
    setNotice(null);
    setJustLoggedOut(false);
  }, []);

  // JWT không lưu phía server → đăng xuất = xóa token ở trình duyệt
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setJustLoggedOut(true);
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({ user, loading, notice, clearNotice, justLoggedOut, login, register, logout, setUser }),
    [user, loading, notice, clearNotice, justLoggedOut, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
