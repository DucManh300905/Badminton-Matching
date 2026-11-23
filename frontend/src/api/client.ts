import axios, { isAxiosError } from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
export const TOKEN_KEY = 'bm-token';
/** Phát khi phiên đăng nhập hết hiệu lực; detail = mã lỗi (TOKEN_EXPIRED…) */
export const UNAUTHORIZED_EVENT = 'bm:unauthorized';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: { field?: string; msg?: string }[];
}

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// localStorage có thể bị chặn (chế độ riêng tư, chính sách trình duyệt) → không để app sập
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // bỏ qua: chỉ mất đăng nhập khi tải lại trang
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // bỏ qua
    }
  },
};

// Tự gắn JWT vào mọi request
client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Chỉ xử lý khi request CÓ gửi token, để đăng nhập sai mật khẩu (cũng là 401) không bị ảnh hưởng.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const hadToken = !!err.config?.headers?.Authorization;
    if (hadToken && err.response?.status === 401) {
      tokenStore.clear();
      const code = (err.response?.data as ApiErrorBody | undefined)?.code ?? 'TOKEN_EXPIRED';
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: code }));
    }
    return Promise.reject(err);
  },
);

// Map theo `code` (docs/API.md)
const CODE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.',
  UNAUTHORIZED: 'Vui lòng đăng nhập để tiếp tục.',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  INVALID_PASSWORD: 'Mật khẩu hiện tại không đúng.',
  DUPLICATE: 'Dữ liệu này đã tồn tại.',
  RATE_LIMITED: 'Bạn thử quá nhiều lần, vui lòng đợi ít phút rồi thử lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  PAYLOAD_TOO_LARGE: 'Nội dung gửi lên quá lớn.',
  SYSTEM_BUSY: 'Hệ thống đang bận, vui lòng thử lại.',
  INTERNAL_ERROR: 'Máy chủ gặp lỗi, vui lòng thử lại sau.',
  POST_NOT_OPEN: 'Kèo đã đủ người hoặc đã bị hủy.',
  POST_STARTED: 'Kèo đã bắt đầu, không thể thay đổi.',
  IS_AUTHOR: 'Bạn là chủ kèo này.',
  ALREADY_JOINED: 'Bạn đã tham gia kèo này rồi.',
  NOT_JOINED: 'Bạn chưa tham gia kèo này.',
  LEVEL_MISMATCH: 'Trình độ của bạn không nằm trong khoảng kèo yêu cầu.',
  NO_SLOT: 'Kèo không còn chỗ phù hợp với giới tính của bạn.',
  NOT_AUTHOR: 'Chỉ chủ kèo mới hủy được kèo.',
  NETWORK: 'Không kết nối được máy chủ. Kiểm tra mạng hoặc backend.',
};

/** Trường bị trùng → câu dễ hiểu (backend chỉ báo tên trường) */
const DUPLICATE_FIELDS: Record<string, string> = {
  email: 'Email này đã được đăng ký.',
};

export interface ApiErrorInfo {
  code: string;
  message: string;
  /** Lỗi theo từng trường, vd { email: 'Email không hợp lệ' } */
  fields: Record<string, string>;
}

/** Chuyển mọi lỗi từ axios thành thông báo tiếng Việt để hiển thị */
export function toApiError(err: unknown): ApiErrorInfo {
  if (!isAxiosError(err)) {
    return { code: 'UNKNOWN', message: 'Đã có lỗi xảy ra.', fields: {} };
  }
  if (!err.response) {
    return { code: 'NETWORK', message: CODE_MESSAGES.NETWORK, fields: {} };
  }

  const data = err.response.data as ApiErrorBody | undefined;
  const code = data?.code ?? 'INTERNAL_ERROR';
  const fields: Record<string, string> = {};

  for (const e of data?.errors ?? []) {
    if (!e.field) continue;
    // "slots.male" → hiển thị chung ở ô "slots"
    const field = e.field.split('.')[0];
    const msg = code === 'DUPLICATE' ? (DUPLICATE_FIELDS[field] ?? CODE_MESSAGES.DUPLICATE) : (e.msg ?? '');
    fields[field] ??= msg;
  }

  const duplicateMsg = code === 'DUPLICATE' ? Object.values(fields)[0] : undefined;
  return {
    code,
    message: duplicateMsg ?? CODE_MESSAGES[code] ?? data?.message ?? 'Đã có lỗi xảy ra.',
    fields,
  };
}

export default client;
