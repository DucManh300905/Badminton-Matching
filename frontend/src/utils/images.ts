/** Giới hạn giống backend (utils/images.js): kiểm tra trước để báo lỗi ngay, khỏi tải lên vô ích */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');

/** Trả về câu báo lỗi, hoặc null nếu ảnh dùng được */
export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh tối đa 5 MB.';
  return null;
}
