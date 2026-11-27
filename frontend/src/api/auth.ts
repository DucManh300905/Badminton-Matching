import client, { type ApiResponse } from './client';
import type { AuthResult, RegisterInput } from '../types';

export const authApi = {
  /** Đăng ký xong là đăng nhập luôn: trả { token, user } */
  async register(input: RegisterInput) {
    const res = await client.post<ApiResponse<AuthResult>>('/auth/register', input);
    return res.data.data;
  },

  async login(email: string, password: string) {
    const res = await client.post<ApiResponse<AuthResult>>('/auth/login', { email, password });
    return res.data.data;
  },

  /** Gửi link đặt lại mật khẩu qua email (luôn trả cùng một câu) */
  async forgotPassword(email: string) {
    const res = await client.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return res.data.message ?? '';
  },

  /** Đặt mật khẩu mới bằng mã trong link email; mọi phiên đăng nhập cũ hết hiệu lực */
  async resetPassword(token: string, password: string) {
    const res = await client.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    return res.data.message ?? '';
  },

  /** Trả token mới — mọi token cũ hết hiệu lực ngay */
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await client.put<ApiResponse<{ token: string }>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data.data.token;
  },
};
