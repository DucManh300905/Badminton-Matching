import { describe, expect, it } from 'vitest';
import { checkImage, MAX_IMAGE_BYTES } from './images';

const fileOf = (type: string, size: number) => new File([new Uint8Array(size)], 'a', { type });

describe('checkImage', () => {
  it('nhận JPEG, PNG, WebP trong giới hạn 5 MB', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp']) expect(checkImage(fileOf(t, 1000))).toBeNull();
    expect(checkImage(fileOf('image/png', MAX_IMAGE_BYTES))).toBeNull();
  });

  it('từ chối định dạng khác và ảnh quá 5 MB', () => {
    expect(checkImage(fileOf('image/gif', 10))).toMatch(/JPEG, PNG hoặc WebP/);
    expect(checkImage(fileOf('application/pdf', 10))).toMatch(/JPEG, PNG hoặc WebP/);
    expect(checkImage(fileOf('image/jpeg', MAX_IMAGE_BYTES + 1))).toMatch(/5 MB/);
  });
});
