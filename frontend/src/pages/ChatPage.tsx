import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { chatsApi, type ChatMessage, type ChatThread } from '../api/chats';
import { toApiError } from '../api/client';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { Alert, Avatar, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const MAX_TEXT = 1000;
/** Không có kết nối thời gian thực thì tự tải lại tin mới mỗi 10 giây */
const POLL_MS = 10_000;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

/** Gộp thêm tin, bỏ trùng theo id, xếp cũ → mới */
const merge = (a: ChatMessage[], b: ChatMessage[]) => {
  const byId = new Map([...a, ...b].map((m) => [m.id, m]));
  return [...byId.values()].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
};

/** Một cuộc trò chuyện: nhóm của kèo hoặc nhắn riêng (WBS 4.13) */
export default function ChatPage() {
  const { key = '' } = useParams();
  const { user } = useAuth();
  const { subscribe, live, refreshUnread } = useChat();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingOld, setLoadingOld] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const load = useCallback(
    () =>
      chatsApi
        .open(key)
        .then((t) => {
          setThread(t);
          setMessages((m) => merge(m, t.messages));
          chatsApi
            .read(key)
            .then(refreshUnread)
            .catch(() => undefined);
        })
        .catch((e) => setError(toApiError(e).message)),
    [key, refreshUnread],
  );

  // Mở cuộc trò chuyện (đổi key → tải lại từ đầu)
  useEffect(() => {
    let cancelled = false;
    chatsApi
      .open(key)
      .then((t) => {
        if (cancelled) return;
        setThread(t);
        setMessages(t.messages);
        chatsApi
          .read(key)
          .then(refreshUnread)
          .catch(() => undefined);
      })
      .catch((e) => !cancelled && setError(toApiError(e).message));
    return () => {
      cancelled = true;
    };
  }, [key, refreshUnread]);

  // Tin mới qua WebSocket
  useEffect(
    () =>
      subscribe((k, m) => {
        if (k !== key) return;
        setMessages((list) => merge(list, [m]));
        chatsApi
          .read(key)
          .then(refreshUnread)
          .catch(() => undefined);
      }),
    [key, subscribe, refreshUnread],
  );

  // Mất kết nối thời gian thực → tải lại định kỳ
  useEffect(() => {
    if (live) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [live, load]);

  // Giữ ở cuối khi có tin mới (trừ khi người dùng đang kéo lên đọc tin cũ)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    if (!messages[0]) return;
    setLoadingOld(true);
    stick.current = false;
    try {
      const t = await chatsApi.open(key, messages[0].at);
      setMessages((m) => merge(t.messages, m));
      setThread((th) => (th ? { ...th, hasMore: t.hasMore } : th));
    } finally {
      setLoadingOld(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    setSendError(null);
    stick.current = true;
    try {
      const m = await chatsApi.send(key, clean);
      setMessages((list) => merge(list, [m]));
      setText('');
    } catch (err) {
      setSendError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    const other = thread?.conversation.other;
    if (!other) return;
    const blocked = thread.conversation.blockedByMe;
    if (!blocked && !window.confirm(`Chặn ${other.displayName}? Hai người sẽ không nhắn riêng được cho nhau.`)) return;
    try {
      if (blocked) await chatsApi.unblock(other.id);
      else await chatsApi.block(other.id);
      await load();
    } catch (err) {
      setSendError(toApiError(err).message);
    }
  }

  const crumbs = [{ to: '/lich-su?tab=messages', label: 'Tin nhắn' }];
  if (error || !thread) {
    return (
      <>
        <PageHeader title="Tin nhắn" breadcrumbs={crumbs} />
        {error ? <Alert>{error}</Alert> : <Spinner />}
      </>
    );
  }

  const c = thread.conversation;
  const subtitle =
    c.kind === 'post' ? `Nhóm kèo · ${thread.members?.length ?? 0} người` : c.blockedByMe ? 'Đã chặn' : 'Nhắn riêng';

  return (
    <div className="chat-page">
      <PageHeader
        title={c.title}
        subtitle={subtitle}
        breadcrumbs={crumbs}
        actions={
          c.kind === 'post' && c.postId ? (
            <Link to={`/keo/${c.postId}`} className="btn btn--outline">
              Xem kèo
            </Link>
          ) : c.other ? (
            <button type="button" className="btn btn--outline" onClick={toggleBlock}>
              {c.blockedByMe ? 'Bỏ chặn' : 'Chặn'}
            </button>
          ) : undefined
        }
      />

      <div className="card chat">
        {thread.members && (
          <div className="chat__members" aria-label="Thành viên">
            {thread.members.map((m) => (
              <span key={m.id} className="chat__member" title={m.isHost ? `${m.displayName} (chủ kèo)` : m.displayName}>
                <Avatar name={m.displayName} url={m.avatarUrl} size="xs" />
                {m.displayName}
                {m.isHost && <span className="chat__host">chủ kèo</span>}
              </span>
            ))}
          </div>
        )}

        <div
          className="chat__list"
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-label="Tin nhắn"
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          }}
        >
          {thread.hasMore && (
            <button type="button" className="btn btn--link chat__older" disabled={loadingOld} onClick={loadOlder}>
              {loadingOld ? 'Đang tải…' : 'Xem tin cũ hơn'}
            </button>
          )}
          {messages.length === 0 && (
            <p className="chat__empty">
              <Icon name="chat" size={36} className="empty__icon" />
              {c.kind === 'post' ? 'Chưa có tin nào. Hẹn giờ, báo đến muộn, hỏi ai mang cầu…' : 'Chưa có tin nào.'}
            </p>
          )}
          {messages.map((m, i) => {
            const mine = m.sender.id === user?.id;
            const prev = messages[i - 1];
            const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
            const sameSender = !newDay && prev?.sender.id === m.sender.id;
            return (
              <div key={m.id}>
                {newDay && <p className="chat__day">{dayOf(m.at)}</p>}
                <div className={`bubble-row${mine ? ' bubble-row--mine' : ''}${sameSender ? ' bubble-row--cont' : ''}`}>
                  {!mine && (
                    <span className="bubble-row__avatar">
                      {!sameSender && <Avatar name={m.sender.displayName} url={m.sender.avatarUrl} size="sm" />}
                    </span>
                  )}
                  <div className="bubble">
                    {!mine && !sameSender && c.kind === 'post' && (
                      <span className="bubble__name">{m.sender.displayName}</span>
                    )}
                    <span className="bubble__text">{m.text}</span>
                    <span className="bubble__time">{timeOf(m.at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {c.canSend ? (
          <form className="chat__composer" onSubmit={handleSend}>
            {sendError && <Alert>{sendError}</Alert>}
            <div className="chat__composer-row">
              <textarea
                className="input"
                rows={1}
                maxLength={MAX_TEXT}
                placeholder="Nhắn tin…"
                aria-label="Nội dung tin nhắn"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  // Enter gửi, Shift + Enter xuống dòng (máy tính)
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                className="btn btn--primary chat__send"
                disabled={busy || !text.trim()}
                aria-label="Gửi"
              >
                <Icon name="send" size={20} />
              </button>
            </div>
          </form>
        ) : (
          <p className="chat__closed">
            <Icon name="lock" size={16} />
            {c.reason ?? 'Không gửi được tin nhắn'}
          </p>
        )}
      </div>
    </div>
  );
}
