import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PostPayment } from '../types';
import PaymentCard from './PaymentCard';

// Không vẽ QR thật trong jsdom (không có canvas): trả về ảnh giả
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,QR')) } }));

const base: PostPayment = {
  hasCosts: true,
  estimate: 50_000,
  bank: { bin: '970436', shortName: 'Vietcombank' },
  accountNumber: '0123456789',
  accountName: 'CHU KEO',
  summary: { paidCount: 0, participantCount: 2, collected: 0, expected: 260_000 },
  amount: 180_000,
  status: 'unpaid',
  toPay: 180_000,
  diff: 0,
  paid: false,
  paidAmount: null,
  attended: null,
  available: true,
  content: 'BM 7207C1 DUC MANH',
  qr: '000201010212...',
};

describe('PaymentCard', () => {
  it('chưa trả: mã QR đúng số tiền, ngân hàng, số tài khoản, nội dung', async () => {
    render(<PaymentCard payment={base} postId="6b03ac71dd6dd4f6e07207c1" />);

    expect(await screen.findByRole('img', { name: /Mã QR chuyển 180\.000/ })).toHaveAttribute(
      'src',
      'data:image/png;base64,QR',
    );
    expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(screen.getByText('BM 7207C1 DUC MANH')).toBeInTheDocument();
    expect(screen.getByText('Chưa trả')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lưu ảnh QR' })).toHaveAttribute('download', 'ma-qr-keo-7207c1.png');
  });

  it('chủ kèo chưa nhập chi phí → chưa có mã QR, hiện chi phí dự kiến', () => {
    render(
      <PaymentCard
        payment={{ ...base, hasCosts: false, amount: 0, toPay: 0, qr: null, available: false }}
        postId="abc"
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/Chủ kèo chưa nhập chi phí\. Chi phí dự kiến khoảng 50\.000đ/)).toBeInTheDocument();
  });

  it('đã trả đủ → không còn mã QR', () => {
    render(
      <PaymentCard
        payment={{ ...base, status: 'paid', toPay: 0, paid: true, paidAmount: 180_000, qr: null }}
        postId="abc"
      />,
    );
    expect(screen.getByText('Đã trả')).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã trả đủ/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('còn thiếu → giải thích và mã QR cho phần thiếu', async () => {
    render(
      <PaymentCard
        payment={{
          ...base,
          amount: 190_000,
          status: 'owe',
          toPay: 10_000,
          diff: 10_000,
          paid: true,
          paidAmount: 180_000,
        }}
        postId="abc"
      />,
    );
    expect(await screen.findByRole('img', { name: /Mã QR chuyển 10\.000/ })).toBeInTheDocument();
    expect(screen.getByText(/cần chuyển thêm 10\.000đ/)).toBeInTheDocument();
  });

  it('trả dư → báo chủ kèo sẽ hoàn lại', () => {
    render(
      <PaymentCard
        payment={{
          ...base,
          amount: 100_000,
          status: 'overpaid',
          toPay: 0,
          diff: 80_000,
          paid: true,
          paidAmount: 180_000,
          qr: null,
        }}
        postId="abc"
      />,
    );
    expect(screen.getByText(/trả dư 80\.000đ/)).toBeInTheDocument();
  });

  it('không có khoản nào phải trả (vd: vắng, không bị tính) → không cần chuyển tiền', () => {
    render(
      <PaymentCard
        payment={{ ...base, amount: 0, toPay: 0, status: 'none', qr: null, available: false, attended: false }}
        postId="abc"
      />,
    );
    expect(screen.getByText(/không phải trả khoản nào/)).toBeInTheDocument();
    expect(screen.getByText(/ghi nhận bạn vắng mặt/)).toBeInTheDocument();
  });
});
