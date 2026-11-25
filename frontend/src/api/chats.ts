import client, { API_URL, type ApiResponse } from './client';
import type { PublicUser } from '../types';

/** Nhắn tin trong app (WBS 4.13) */
export interface ChatMessage {
  id: string;
  text: string;
  at: string;
  sender: PublicUser;
}

export interface ChatSummary {
  key: string;
  kind: 'post' | 'direct';
  title: string;
  subtitle: string;
  postId?: string;
  startsAt?: string;
  coverUrl?: string | null;
  other?: PublicUser;
  canSend?: boolean;
  lastMessage: { text: string; at: string; mine: boolean } | null;
  /** Số tin chưa xem */
  unread: number;
}

export interface ChatConversation {
  key: string;
  kind: 'post' | 'direct';
  title: string;
  subtitle: string;
  postId?: string;
  startsAt?: string;
  other?: PublicUser;
  blockedByMe?: boolean;
  canSend: boolean;
  openUntil: string | null;
  /** Lý do không gửi được (đã quá hạn, đã chặn…) */
  reason: string | null;
}

export interface ChatThread {
  conversation: ChatConversation;
  members?: (PublicUser & { isHost: boolean })[];
  messages: ChatMessage[];
  hasMore: boolean;
}

export const chatsApi = {
  async list() {
    const res = await client.get<ApiResponse<ChatSummary[]>>('/chats');
    return res.data.data;
  },

  /** Tổng số tin chưa xem (count) và số cuộc trò chuyện có tin chưa xem */
  async unread() {
    const res = await client.get<ApiResponse<{ count: number; conversations: number }>>('/chats/unread');
    return res.data.data.count;
  },

  async open(key: string, before?: string) {
    const res = await client.get<ApiResponse<ChatThread>>(`/chats/${key}`, { params: before ? { before } : {} });
    return res.data.data;
  },

  async send(key: string, text: string) {
    const res = await client.post<ApiResponse<ChatMessage>>(`/chats/${key}/messages`, { text });
    return res.data.data;
  },

  async read(key: string) {
    await client.post(`/chats/${key}/read`);
  },

  /** Khóa cuộc nhắn riêng với một người đã cùng chơi */
  async directWith(userId: string) {
    const res = await client.get<ApiResponse<{ key: string }>>(`/chats/direct/${userId}`);
    return res.data.data.key;
  },

  async block(userId: string) {
    await client.post(`/chats/blocks/${userId}`);
  },

  async unblock(userId: string) {
    await client.delete(`/chats/blocks/${userId}`);
  },
};

/** Địa chỉ WebSocket cùng nơi với API: http://x/api → ws://x/api/ws, /api → wss://<trang hiện tại>/api/ws */
export function socketUrl(): string {
  const u = new URL(API_URL, window.location.href);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = `${u.pathname.replace(/\/$/, '')}/ws`;
  return u.toString();
}
