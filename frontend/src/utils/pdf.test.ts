import { describe, expect, it } from 'vitest';
import { contentBox } from './pdf';

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height }) as DOMRect;
const style = (border: number, padding: number) => ({
  borderLeftWidth: `${border}px`,
  borderRightWidth: `${border}px`,
  borderTopWidth: `${border}px`,
  borderBottomWidth: `${border}px`,
  paddingLeft: `${padding}px`,
  paddingRight: `${padding}px`,
  paddingTop: `${padding}px`,
  paddingBottom: `${padding}px`,
});

describe('contentBox (vẽ lại ảnh QR / bill lên bản chụp PDF)', () => {
  it('bỏ viền và khoảng đệm, tính theo góc của tờ hóa đơn', () => {
    // QR 160×160, viền 1px, đệm 6px, nằm ở (130, 620) trên trang; tờ hóa đơn bắt đầu ở (100, 100)
    expect(contentBox(rect(130, 620, 160, 160), rect(100, 100, 800, 1200), style(1, 6))).toEqual({
      x: 37,
      y: 527,
      w: 146,
      h: 146,
    });
  });

  it('ảnh không viền, không đệm: đúng bằng khung ảnh', () => {
    expect(contentBox(rect(10, 20, 300, 200), rect(0, 0, 800, 1200), style(0, 0))).toEqual({ x: 10, y: 20, w: 300, h: 200 });
  });
});
