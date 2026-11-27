import client, { imageForm, type ApiResponse } from './client';
import type { BankAccount, PostSummary, User } from '../types';

export type ProfileInput = Partial<Pick<User, 'displayName' | 'gender' | 'level'>> & {
  /** "" = xóa số điện thoại */
  phone?: string;
};

export interface MyPosts {
  /** Kèo tôi đã đăng */
  authored: PostSummary[];
  /** Kèo tôi đã tham gia */
  joined: PostSummary[];
}

export const usersApi = {
  async me() {
    const res = await client.get<ApiResponse<User>>('/users/me');
    return res.data.data;
  },

  async updateMe(input: ProfileInput) {
    const res = await client.put<ApiResponse<User>>('/users/me', input);
    return res.data.data;
  },

  /** Lưu / sửa tài khoản nhận tiền (server tự bỏ khoảng trắng, đổi tên sang in hoa không dấu) */
  async setBankAccount(input: BankAccount) {
    const res = await client.put<ApiResponse<User>>('/users/me/bank-account', input);
    return res.data.data;
  },

  /** Tải ảnh đại diện (server tự cắt 256×256, đổi WebP, xóa EXIF / GPS) */
  async uploadAvatar(file: File) {
    const res = await client.put<ApiResponse<User>>('/users/me/avatar', ...imageForm(file));
    return res.data.data;
  },

  async deleteAvatar() {
    const res = await client.delete<ApiResponse<User>>('/users/me/avatar');
    return res.data.data;
  },

  /** 3 tiện ích của thanh dưới, lưu theo tài khoản; null = về mặc định */
  async setTabBar(items: string[] | null) {
    const res = await client.put<ApiResponse<User>>('/users/me/tab-bar', { items });
    return res.data.data;
  },

  async deleteBankAccount() {
    const res = await client.delete<ApiResponse<User>>('/users/me/bank-account');
    return res.data.data;
  },

  /** Kèo đã đăng và đã tham gia (gồm cả kèo đã qua / đã hủy), mới nhất trước */
  async myPosts() {
    const res = await client.get<ApiResponse<MyPosts>>('/users/me/posts');
    return res.data.data;
  },
};
