import client, { type ApiResponse } from './client';
import type { CreatePostInput, PostDetail, PostFilter, PostSummary } from '../types';

export const postsApi = {
  /** Kèo sắp diễn ra (không cần đăng nhập) */
  async list(filter: PostFilter = {}) {
    const res = await client.get<ApiResponse<PostSummary[]>>('/posts', { params: filter });
    return res.data.data;
  },

  async get(id: string) {
    const res = await client.get<ApiResponse<PostDetail>>(`/posts/${id}`);
    return res.data.data;
  },

  async create(input: CreatePostInput) {
    const res = await client.post<ApiResponse<PostDetail>>('/posts', input);
    return res.data.data;
  },

  async join(id: string) {
    const res = await client.post<ApiResponse<PostDetail>>(`/posts/${id}/join`);
    return res.data.data;
  },

  async leave(id: string) {
    const res = await client.delete<ApiResponse<PostDetail>>(`/posts/${id}/join`);
    return res.data.data;
  },

  /** Chỉ chủ kèo, trước giờ bắt đầu */
  async cancel(id: string) {
    const res = await client.post<ApiResponse<PostDetail>>(`/posts/${id}/cancel`);
    return res.data.data;
  },
};
