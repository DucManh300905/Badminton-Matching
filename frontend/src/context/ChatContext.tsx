import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chatsApi, socketUrl, type ChatMessage } from '../api/chats';
import { tokenStore } from '../api/client';
import { useAuth } from './AuthContext';

type Listener = (key: string, message: ChatMessage) => void;

interface ChatState {
  /** Tổng số tin chưa xem (số đỏ ở "Lịch sử") */
  unread: number;
  /** Kết nối thời gian thực đang mở (false → trang chat tự tải lại định kỳ) */
  live: boolean;
  refreshUnread: () => void;
  /** Nghe tin mới; trả về hàm hủy */
  subscribe: (fn: Listener) => () => void;
}

const ChatContext = createContext<ChatState | null>(null);

const MAX_BACKOFF_MS = 30_000;

/**
 * Một kết nối WebSocket cho cả app (WBS 4.13): đăng nhập bằng tin đầu tiên, nhận tin mới,
 * tự kết nối lại (chờ tăng dần tới 30 giây) khi mất mạng hoặc máy chủ khởi động lại.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState(false);
  const listeners = useRef(new Set<Listener>());

  const refreshUnread = useCallback(() => {
    if (!tokenStore.get()) return;
    chatsApi
      .unread()
      .then(setUnread)
      .catch(() => undefined);
  }, []);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let ws: WebSocket | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let backoff = 1000;

    const connect = () => {
      const token = tokenStore.get();
      if (stopped || !token) return;
      ws = new WebSocket(socketUrl());
      ws.onopen = () => ws?.send(JSON.stringify({ type: 'auth', token }));
      ws.onmessage = (e) => {
        let msg: { type: string; key?: string; message?: ChatMessage };
        try {
          msg = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (msg.type === 'ready') {
          backoff = 1000;
          setLive(true);
          refreshUnread();
        }
        if (msg.type === 'message' && msg.key && msg.message) {
          for (const fn of listeners.current) fn(msg.key, msg.message);
          if (msg.message.sender.id !== userId) refreshUnread();
        }
      };
      ws.onclose = () => {
        setLive(false);
        if (stopped) return;
        retry = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      };
    };

    refreshUnread();
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      ws?.close();
      setLive(false);
      setUnread(0);
    };
  }, [userId, refreshUnread]);

  const value = useMemo(() => ({ unread, live, refreshUnread, subscribe }), [unread, live, refreshUnread, subscribe]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat phải nằm trong ChatProvider');
  return ctx;
}
