import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { chatsApi, type ChatSummary } from '../api/chats';
import { toApiError } from '../api/client';
import { useChat } from '../context/ChatContext';
import Icon from './Icon';
import { Alert, Avatar, CountBadge, Spinner } from './ui';

const whenOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/** Tab "Tin nhắn" trong Lịch sử: nhóm của các kèo + nhắn riêng, mới nhất trước */
export default function ChatList() {
  const { subscribe } = useChat();
  const [items, setItems] = useState<ChatSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      chatsApi
        .list()
        .then(setItems)
        .catch((e) => setError(toApiError(e).message));
    load();
    return subscribe(() => {
      load();
    });
  }, [subscribe]);

  if (error) return <Alert>{error}</Alert>;
  if (!items) return <Spinner />;
  if (items.length === 0) {
    return (
      <div className="card empty">
        <Icon name="chat" size={40} className="empty__icon" />
        <p>
          Chưa có cuộc trò chuyện nào. Tham gia hoặc đăng kèo để nhắn tin với mọi người trong kèo.{' '}
          <Link to="/">Tìm kèo</Link>
        </p>
      </div>
    );
  }

  return (
    <ul className="card chat-list">
      {items.map((c) => (
        <li key={c.key}>
          <Link to={`/lich-su/tin-nhan/${c.key}`} className={`chat-item${c.unread > 0 ? ' chat-item--unread' : ''}`}>
            {c.kind === 'direct' && c.other ? (
              <Avatar name={c.other.displayName} url={c.other.avatarUrl} />
            ) : (
              <span className="chat-item__group" aria-hidden="true">
                <Icon name="users" size={22} />
              </span>
            )}
            <span className="chat-item__body">
              <span className="chat-item__top">
                <span className="chat-item__title">{c.title}</span>
                {c.lastMessage && <span className="chat-item__when">{whenOf(c.lastMessage.at)}</span>}
              </span>
              <span className="chat-item__last">
                {c.lastMessage
                  ? `${c.lastMessage.mine ? 'Bạn: ' : ''}${c.lastMessage.text}`
                  : c.kind === 'post'
                    ? 'Nhóm kèo · chưa có tin nhắn'
                    : ''}
              </span>
            </span>
            <CountBadge count={c.unread} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
