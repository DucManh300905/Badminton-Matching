import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PostPayment } from '../types';
import PaymentCard from './PaymentCard';

// Không vẽ QR thật trong jsdom (không có canvas): trả về ảnh giả
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,QR')) } }));

const base: PostPayment = {
  amount: 50_000,
  available: true,
  bank: { bin: '970436', shortName: 'Vietcombank' },
  accountNumber: '0123456789',
  accountName: 'CHU KEO',
  summary: { paidCount: 0, participantCount: 1, collected: 0, expected: 50_000 },
  content: 'BM 7207C1 DUC MANH',
  qr: '000201010212...',
  paid: false,
};

describe('PaymentCard', () => {
  it('hiện mã QR, số tiền, ngân hàng, số tài khoản, nội dung và trạng thái chưa xác nhận', async () => {
    render(<PaymentCard payment={base} postId="6b03ac71dd6dd4f6e07207c1" />);

    expect(await screen.findByRole('img', { name: /Mã QR chuyển 50\.000/ })).toHaveAttribute(
      'src',
      'data:image/png;base64,QR',
    );
    expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(screen.getByText('BM 7207C1 DUC MANH')).toBeInTheDocument();
    expect(screen.getByText('Chưa xác nhận')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lưu ảnh QR' })).toHaveAttribute('download', 'ma-qr-keo-7207c1.png');
  });

  it('chủ kèo đã đánh dấu → "Đã trả"', async () => {
    render(<PaymentCard payment={{ ...base, paid: true }} postId="abc123" />);
    expect(await screen.findByText('Đã trả')).toBeInTheDocument();
  });

  it('chủ kèo chưa nhập tài khoản → không có mã QR, hướng dẫn trả trực tiếp', () => {
    render(
      <PaymentCard
        payment={{ ...base, available: false, qr: null, bank: null, accountNumber: null, accountName: null }}
        postId="abc123"
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/chưa thêm tài khoản nhận tiền/)).toBeInTheDocument();
  });

  it('đã chốt chi phí → hiện từng khoản và số tiền mỗi người', async () => {
    render(
      <PaymentCard
        payment={{ ...base, amount: 53_000, attended: true }}
        postId="abc123"
        settlement={{
          courtFee: 320_000,
          shuttleFee: 80_000,
          otherFee: 20_000,
          total: 420_000,
          headcount: 8,
          chargeAbsent: false,
          perPerson: 53_000,
          settledAt: '2026-11-24T15:00:00.000Z',
        }}
      />,
    );
    expect(await screen.findByText('Tiền sân')).toBeInTheDocument();
    expect(screen.getByText(/420\.000.*53\.000/)).toBeInTheDocument();
  });

  it('vắng mặt, chủ kèo không thu người vắng → không phải trả', () => {
    render(<PaymentCard payment={{ ...base, amount: 0, available: false, qr: null, attended: false }} postId="abc" />);
    expect(screen.getByText(/ghi nhận bạn vắng mặt buổi này, bạn không phải trả/)).toBeInTheDocument();
  });

  it('vắng mặt nhưng chủ kèo thu cả người vắng → vẫn có mã QR, có giải thích', async () => {
    render(<PaymentCard payment={{ ...base, attended: false }} postId="abc" />);
    expect(await screen.findByRole('img')).toBeInTheDocument();
    expect(screen.getByText(/người vắng vẫn trả phần của mình/)).toBeInTheDocument();
  });

  it('kèo miễn phí → không cần chuyển tiền', () => {
    render(<PaymentCard payment={{ ...base, amount: 0, available: false, qr: null }} postId="abc123" />);
    expect(screen.getByText(/Kèo miễn phí/)).toBeInTheDocument();
  });
});
