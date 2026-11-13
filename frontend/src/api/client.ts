import axios, { isAxiosError } from 'axios'
import type {
  CreatePostInput,
  ParsedPost,
  PostDetail,
  PostFilter,
  PostSummary,
  RegisterInput,
  User,
} from './types'

/** Gọi API cùng domain (`/api/...`). Cookie đăng nhập được trình duyệt tự gửi kèm. */
export const http = axios.create({ baseURL: '/api', withCredentials: true })

export const authApi = {
  me: () => http.get<{ user: User | null }>('/auth/me').then((r) => r.data.user),
  login: (email: string, password: string) =>
    http.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data.user),
  register: (input: RegisterInput) => http.post<{ user: User }>('/auth/register', input).then((r) => r.data.user),
  logout: () => http.post('/auth/logout').then(() => undefined),
}

export const postsApi = {
  list: (filter: PostFilter) =>
    http.get<{ posts: PostSummary[] }>('/posts', { params: filter }).then((r) => r.data.posts),
  get: (id: string) => http.get<{ post: PostDetail }>(`/posts/${id}`).then((r) => r.data.post),
  create: (input: CreatePostInput) => http.post<{ post: PostDetail }>('/posts', input).then((r) => r.data.post),
  join: (id: string) => http.post<{ post: PostDetail }>(`/posts/${id}/join`).then((r) => r.data.post),
  leave: (id: string) => http.delete<{ post: PostDetail }>(`/posts/${id}/join`).then((r) => r.data.post),
}

export const parseApi = {
  parse: (text: string) => http.post<{ result: ParsedPost }>('/parse', { text }).then((r) => r.data.result),
}

// ------------------------------------------------------------------ Lỗi ----

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Bạn cần đăng nhập để thực hiện thao tác này.',
  EMAIL_TAKEN: 'Email này đã được đăng ký.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  POST_NOT_FOUND: 'Không tìm thấy kèo.',
  POST_NOT_OPEN: 'Kèo đã đủ người hoặc đã đóng.',
  POST_STARTED: 'Kèo đã bắt đầu, không thể thay đổi.',
  IS_AUTHOR: 'Bạn là chủ kèo này.',
  ALREADY_JOINED: 'Bạn đã tham gia kèo này rồi.',
  NOT_JOINED: 'Bạn chưa tham gia kèo này.',
  LEVEL_MISMATCH: 'Trình độ của bạn không nằm trong khoảng kèo yêu cầu.',
  NO_SLOT: 'Kèo không còn chỗ phù hợp với giới tính của bạn.',
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ.',
  INTERNAL_ERROR: 'Máy chủ gặp lỗi, vui lòng thử lại sau.',
}

export interface ApiErrorInfo {
  code: string
  message: string
  /** Lỗi theo từng trường (khi dữ liệu không hợp lệ). */
  fields: Record<string, string>
}

/** Chuyển mọi lỗi từ axios thành thông báo tiếng Việt để hiển thị. */
export function toApiError(err: unknown): ApiErrorInfo {
  if (isAxiosError(err)) {
    if (!err.response) {
      return { code: 'NETWORK', message: 'Không kết nối được máy chủ. Kiểm tra mạng hoặc backend.', fields: {} }
    }
    const data = err.response.data as { error?: string; details?: { field: string; message: string }[] }
    const code = data?.error ?? 'INTERNAL_ERROR'
    const fields: Record<string, string> = {}
    for (const d of data?.details ?? []) fields[d.field] ??= d.message
    return { code, message: ERROR_MESSAGES[code] ?? 'Đã có lỗi xảy ra.', fields }
  }
  return { code: 'UNKNOWN', message: 'Đã có lỗi xảy ra.', fields: {} }
}
