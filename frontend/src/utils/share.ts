// Tin tổng kết kèo để gửi sang Zalo / Messenger (WBS 4.8.4, US-35). Không emoji, chỉ chữ thường.
import type { PostDetail } from '../types';
import { expenseName } from './costs';
import { formatLevelRange, formatMoney, formatPrice, formatSlots, formatTimeRange } from './format';

const linkOf = (post: PostDetail, origin: string) => `${origin}/keo/${post.id}`;

/** Tin tuyển người: ai xem kèo cũng chia sẻ được */
export function recruitText(post: PostDetail, origin: string): string {
  const left = post.remaining.male + post.remaining.female + post.remaining.any;
  const lines = [
    `[Kèo cầu lông] ${formatTimeRange(post.startsAt, post.endsAt)}`,
    `${post.courtName} (${post.district}) · Trình độ ${formatLevelRange(post.levelMin, post.levelMax)}`,
    post.status === 'open' && left > 0
      ? `Còn ${left} chỗ: ${formatSlots(post.remaining)} · khoảng ${formatPrice(post.pricePerPerson)}/người`
      : post.status === 'closed'
        ? 'Kèo đã hủy'
        : 'Kèo đã đủ người',
  ];
  if (post.address) lines.push(`Địa chỉ: ${post.address}`);
  lines.push(`Tham gia: ${linkOf(post, origin)}`);
  return lines.join('\n');
}

/** Tin thu tiền: chỉ người trong kèo, khi chủ kèo đã nhập chi phí */
export function moneyText(post: PostDetail, origin: string): string | null {
  const costs = post.costs;
  if (!costs || costs.expenses.length === 0) return null;
  const status = (s?: string) => (s === 'paid' || s === 'overpaid' ? ' (đã trả)' : s === 'owe' ? ' (còn thiếu)' : '');
  const lines = [
    `[Chi phí kèo] ${post.courtName} · ${formatTimeRange(post.startsAt, post.endsAt)}`,
    `Tổng ${formatMoney(costs.total)}:`,
    ...costs.expenses.map(
      (e) =>
        `- ${expenseName(e)}${e.quantity != null && e.unitPrice != null ? ` (${e.quantity} quả)` : ''}: ${formatMoney(e.amount)}`,
    ),
    'Mỗi người:',
    ...costs.members.map(
      (m) =>
        `- ${m.name}${m.type === 'host' ? ' (chủ kèo)' : ''}: ${formatMoney(m.due ?? 0)}${m.type === 'user' ? status(m.status) : ''}`,
    ),
    `Quét mã QR để chuyển khoản: ${linkOf(post, origin)}`,
  ];
  return lines.join('\n');
}

/**
 * Chia sẻ: điện thoại mở bảng chia sẻ của máy (Zalo, Messenger…); không có thì chép vào bộ nhớ tạm.
 * @returns 'shared' | 'copied' | 'cancelled'
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Trình duyệt chặn clipboard (http, quyền): chép bằng ô nhập ẩn
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  return 'copied';
}
