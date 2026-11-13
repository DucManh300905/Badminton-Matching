import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { PostSummary } from '../types';
import PostCard from './PostCard';

const base: PostSummary = {
  id: 'p1',
  courtName: 'Sân Cầu Giấy',
  district: 'Cầu Giấy',
  address: null,
  startsAt: new Date(2026, 10, 13, 19, 0).toISOString(),
  endsAt: new Date(2026, 10, 13, 21, 0).toISOString(),
  levelMin: 'TB_MINUS',
  levelMax: 'TB_PLUS',
  pricePerPerson: 50_000,
  slots: { male: 2, female: 1, any: 0 },
  remaining: { male: 1, female: 1, any: 0 },
  participantCount: 1,
  status: 'open',
  note: null,
  author: { id: 'u1', displayName: 'Minh' },
};

const renderCard = (post: PostSummary) =>
  render(
    <MemoryRouter>
      <PostCard post={post} />
    </MemoryRouter>,
  );

describe('PostCard', () => {
  it('hiển thị thông tin chính và liên kết tới trang chi tiết', () => {
    renderCard(base);
    const link = screen.getByRole('link', { name: 'Kèo Sân Cầu Giấy' });
    expect(link).toHaveAttribute('href', '/keo/p1');
    expect(screen.getByText('Còn 2 chỗ')).toBeInTheDocument();
    expect(screen.getByText('1 nam · 1 nữ')).toBeInTheDocument();
    expect(screen.getByText(/TB- → TB\+/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000đ\/người/)).toBeInTheDocument();
    expect(screen.getByText('T6, 13/11 · 19:00–21:00')).toBeInTheDocument();
  });

  it('hiển thị "Đủ người" khi kèo đã đủ', () => {
    renderCard({ ...base, status: 'full', remaining: { male: 0, female: 0, any: 0 } });
    expect(screen.getByText('Đủ người')).toBeInTheDocument();
  });
});

describe('PostCard – trạng thái', () => {
  it('kèo đã hủy → "Đã hủy"', () => {
    renderCard({ ...base, status: 'closed' });
    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
  });

  it('có truyền `now` và kèo đã bắt đầu → "Đã diễn ra"', () => {
    render(
      <MemoryRouter>
        <PostCard post={base} now={new Date(2026, 10, 13, 20, 0).getTime()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Đã diễn ra')).toBeInTheDocument();
  });
});
