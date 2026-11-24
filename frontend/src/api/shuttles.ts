import client, { type ApiResponse } from './client';
import type { Shuttle, ShuttleStats } from '../types';

/** Kho cầu (WBS 4.10) */
export const shuttlesApi = {
  async list() {
    const res = await client.get<ApiResponse<Shuttle[]>>('/shuttles');
    return res.data.data;
  },

  async stats() {
    const res = await client.get<ApiResponse<ShuttleStats>>('/shuttles/stats');
    return res.data.data;
  },

  /** Thêm loại cầu kèm lần nhập đầu: server chia tổng tiền ra giá mỗi quả */
  async create(input: { name: string; quantity: number; totalPrice: number }) {
    const res = await client.post<ApiResponse<Shuttle>>('/shuttles', input);
    return res.data.data;
  },

  /** Nhập thêm: cộng số quả, giá tính bình quân */
  async restock(id: string, input: { quantity: number; totalPrice: number }) {
    const res = await client.post<ApiResponse<Shuttle>>(`/shuttles/${id}/restock`, input);
    return res.data.data;
  },

  /** Đổi tên / kiểm kê lại số quả */
  async update(id: string, input: { name?: string; quantity?: number }) {
    const res = await client.patch<ApiResponse<Shuttle>>(`/shuttles/${id}`, input);
    return res.data.data;
  },

  async remove(id: string) {
    await client.delete(`/shuttles/${id}`);
  },
};
