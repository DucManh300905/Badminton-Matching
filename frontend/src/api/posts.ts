import client, { imageForm, type ApiResponse } from './client';
import type { CreatePostInput, PostDetail, PostFilter, PostSummary, CostsInput } from '../types';

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

  /** Chỉ chủ kèo, kèo chưa hủy: đổi / xóa ("") số liên hệ của kèo (WBS 4.16) */
  async setContactPhone(id: string, contactPhone: string) {
    const res = await client.patch<ApiResponse<PostDetail>>(`/posts/${id}/contact-phone`, { contactPhone });
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

  /** Chỉ chủ kèo, bất cứ lúc nào (trừ kèo đã hủy): lưu toàn bộ khoản chi + bạn không dùng app */
  /** Người chơi gửi ảnh chuyển khoản (tối đa 3); chủ kèo nhận email */
  async addProof(id: string, file: File) {
    const res = await client.post<ApiResponse<PostDetail>>(`/posts/${id}/proofs`, ...imageForm(file));
    return res.data.data;
  },

  async removeProof(id: string, file: string) {
    const res = await client.delete<ApiResponse<PostDetail>>(`/posts/${id}/proofs/${encodeURIComponent(file)}`);
    return res.data.data;
  },

  /** Chủ kèo thêm ảnh bill (tối đa 7) */
  async addBill(id: string, file: File) {
    const res = await client.post<ApiResponse<PostDetail>>(`/posts/${id}/bills`, ...imageForm(file));
    return res.data.data;
  },

  async removeBill(id: string, file: string) {
    const res = await client.delete<ApiResponse<PostDetail>>(`/posts/${id}/bills/${encodeURIComponent(file)}`);
    return res.data.data;
  },

  async updateCosts(id: string, input: CostsInput) {
    const res = await client.put<ApiResponse<PostDetail>>(`/posts/${id}/costs`, input);
    return res.data.data;
  },

  /** Chỉ chủ kèo, từ giờ bắt đầu: điểm danh có mặt / vắng */
  async setAttendance(id: string, attendance: { userId: string; attended: boolean }[]) {
    const res = await client.put<ApiResponse<PostDetail>>(`/posts/${id}/attendance`, { attendance });
    return res.data.data;
  },

  /** Chỉ chủ kèo, kèo chưa hủy: ảnh bìa (server tự cắt 1200×630, đổi WebP) */
  async uploadCover(id: string, file: File) {
    const res = await client.put<ApiResponse<PostDetail>>(`/posts/${id}/cover`, ...imageForm(file));
    return res.data.data;
  },

  async deleteCover(id: string) {
    const res = await client.delete<ApiResponse<PostDetail>>(`/posts/${id}/cover`);
    return res.data.data;
  },

  /** Chỉ chủ kèo: đánh dấu một người đã / chưa chuyển tiền */
  async setPaid(id: string, userId: string, paid: boolean) {
    const res = await client.patch<ApiResponse<PostDetail>>(`/posts/${id}/participants/${userId}/payment`, { paid });
    return res.data.data;
  },
};
