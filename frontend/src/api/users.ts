import client, { type ApiResponse } from './client';
import type { PostSummary, User } from '../types';

export type ProfileInput = Partial<Pick<User, 'displayName' | 'gender' | 'level'>>;

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

  /** Kèo đã đăng và đã tham gia (gồm cả kèo đã qua / đã hủy), mới nhất trước */
  async myPosts() {
    const res = await client.get<ApiResponse<MyPosts>>('/users/me/posts');
    return res.data.data;
  },
};
