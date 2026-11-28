const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;

// ── Xuất PDF hóa đơn ngay trong trình duyệt (WBS 4.14) ──
// Chức năng in (window.print) không chạy khi web được mở như app trên điện thoại hoặc trong Zalo / Facebook,
// nên chụp tờ hóa đơn thành ảnh rồi ghép vào PDF khổ A4. Thư viện chỉ tải khi bấm nút.

/** Vị trí phần nội dung của ảnh (bỏ viền, khoảng đệm) so với `node`, đơn vị px CSS */
export function contentBox(img: DOMRect, node: DOMRect, cs: Pick<CSSStyleDeclaration, 'borderLeftWidth' | 'borderRightWidth' | 'borderTopWidth' | 'borderBottomWidth' | 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'>) {
  const n = (v: string) => parseFloat(v) || 0;
  const left = n(cs.borderLeftWidth) + n(cs.paddingLeft);
  const top = n(cs.borderTopWidth) + n(cs.paddingTop);
  return {
    x: img.left - node.left + left,
    y: img.top - node.top + top,
    w: img.width - left - n(cs.borderRightWidth) - n(cs.paddingRight),
    h: img.height - top - n(cs.borderBottomWidth) - n(cs.paddingBottom),
  };
}

/**
 * Vẽ lại mọi ảnh (QR, ảnh bill) lên bản chụp đúng vị trí. Safari (iPhone, iPad) thường bỏ trống ảnh <img>
 * khi html-to-image vẽ trang qua SVG, nên chữ có mà QR trắng. Ảnh đều cùng tên miền (data URL, /uploads),
 * vẽ lên canvas không bị chặn.
 */
function redrawImages(canvas: HTMLCanvasElement, node: HTMLElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const box = node.getBoundingClientRect();
  const scale = canvas.width / box.width;
  for (const img of node.querySelectorAll('img')) {
    if (!img.complete || img.naturalWidth === 0) continue;
    const b = contentBox(img.getBoundingClientRect(), box, getComputedStyle(img));
    if (b.w <= 0 || b.h <= 0) continue;
    try {
      ctx.drawImage(img, b.x * scale, b.y * scale, b.w * scale, b.h * scale);
    } catch {
      // Ảnh không vẽ được (khác tên miền…) → giữ như bản chụp
    }
  }
}

/** Chụp phần tử thành file PDF (nhiều trang nếu dài). Khi chụp luôn dùng màu sáng. */
export async function buildPdf(node: HTMLElement, fileName: string): Promise<File> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const root = document.documentElement;
  const theme = root.dataset.theme;
  root.dataset.theme = 'light';
  try {
    // Chờ mọi ảnh tải và giải mã xong trước khi chụp
    await Promise.all([...node.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)));
    // skipFonts: font Google (khác tên miền) không đọc được để nhúng → dùng font hệ thống, tiếng Việt vẫn đúng
    const canvas = await toCanvas(node, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
    redrawImages(canvas, node);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const width = PAGE_W - 2 * MARGIN;
    const pagePx = Math.floor(((PAGE_H - 2 * MARGIN) * canvas.width) / width);

    for (let y = 0, page = 0; y < canvas.height; y += pagePx, page += 1) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(pagePx, canvas.height - y);
      slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (page > 0) pdf.addPage();
      pdf.addImage(
        slice.toDataURL('image/jpeg', 0.92),
        'JPEG',
        MARGIN,
        MARGIN,
        width,
        (slice.height * width) / canvas.width,
      );
    }
    return new File([pdf.output('blob')], fileName, { type: 'application/pdf' });
  } finally {
    if (theme) root.dataset.theme = theme;
  }
}

/**
 * Điện thoại: mở bảng chia sẻ file (lưu vào máy, gửi Zalo…). Máy tính hoặc máy không hỗ trợ: tải file xuống.
 * Ném lỗi NotAllowedError nếu trình duyệt đòi người dùng bấm lại (đã quá lâu kể từ lần bấm).
 */
export async function deliverPdf(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'AbortError') return 'cancelled';
      if (name === 'NotAllowedError') throw e;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}
