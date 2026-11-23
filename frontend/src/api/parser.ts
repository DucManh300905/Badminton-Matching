import client, { type ApiResponse } from './client';
import type { ParsedPost } from '../types';

export const parserApi = {
  /** "Dán bài → tự điền": trích thông tin kèo từ nội dung bài đăng */
  async parse(text: string) {
    const res = await client.post<ApiResponse<ParsedPost>>('/parse', { text });
    return res.data.data;
  },
};
