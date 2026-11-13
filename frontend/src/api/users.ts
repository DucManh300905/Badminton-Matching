import client, { type ApiResponse } from './client';
import type { User } from '../types';

export type ProfileInput = Partial<Pick<User, 'displayName' | 'gender' | 'level'>>;

export const usersApi = {
  async me() {
    const res = await client.get<ApiResponse<User>>('/users/me');
    return res.data.data;
  },

  async updateMe(input: ProfileInput) {
    const res = await client.put<ApiResponse<User>>('/users/me', input);
    return res.data.data;
  },
};
