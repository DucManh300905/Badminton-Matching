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

  /** Trả token mới — mọi token cũ hết hiệu lực ngay */
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await client.put<ApiResponse<{ token: string }>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data.data.token;
  },
};
