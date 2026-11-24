import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { Alert, Spinner } from '../components/ui';
import type { CostMember, PostDetail } from '../types';
import { expenseName } from '../utils/costs';
import { formatMoney, formatTimeRange } from '../utils/format';

const STATUS: Record<string, (diff: number) => string> = {
  none: () => '—',
  unpaid: () => 'Chưa trả',
  paid: () => 'Đã trả',
  owe: (d) => `Còn thiếu ${formatMoney(d)}`,
  overpaid: (d) => `Trả dư ${formatMoney(d)}`,
};

const memberType = (m: CostMember) =>
  m.type === 'host' ? 'Chủ kèo' : m.type === 'guest' ? 'Không dùng app' : 'Người chơi';

/** Mã ngắn để đối chiếu, giống nội dung chuyển khoản */
const shortCode = (id: string) => id.slice(-6).toUpperCase();

/** Tên file PDF gợi ý (trình duyệt lấy theo tiêu đề trang): bỏ dấu, nối bằng gạch ngang */
const fileTitle = (p: PostDetail) =>
  `Hoa-don-${p.courtName}-${p.startsAt.slice(0, 10)}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9-]+/g, '-');

/**
 * Hóa đơn kèo (WBS 4.11): mọi người trong kèo xem và lưu PDF bằng chức năng in của trình duyệt.
 * Chữ tiếng Việt in đúng vì dùng font của trình duyệt, không cần thư viện tạo PDF.
 */
export default function InvoicePage() {
  const { id = '' } = useParams();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuedAt] = useState(() => new Date());

  useEffect(() => {
    postsApi
      .get(id)
      .then(setPost)
      .catch((e) => setError(toApiError(e).message));
  }, [id]);

  // Tiêu đề trang = tên file khi "Lưu dưới dạng PDF"
  useEffect(() => {
    if (!post) return;
    const before = document.title;
    document.title = fileTitle(post);
    return () => {
      document.title = before;
    };
  }, [post]);

  const crumbs = [{ to: `/keo/${id}`, label: post?.courtName ?? 'Chi tiết kèo' }];

  if (error || !post) {
    return (
      <>
        <PageHeader title="Hóa đơn kèo" breadcrumbs={crumbs} />
        {error ? <Alert>{error}</Alert> : <Spinner />}
      </>
    );
  }

  const costs = post.costs;
  if (!costs) {
    return (
      <>
        <PageHeader title="Hóa đơn kèo" breadcrumbs={crumbs} />
        <Alert>Chỉ chủ kèo và người đã tham gia mới xem được hóa đơn của kèo này.</Alert>
      </>
    );
  }

  const nameOf = new Map(costs.members.map((m) => [m.ref, m.name]));
  const pay = post.payment;

  return (
    <>
      <PageHeader title="Hóa đơn kèo" subtitle={post.courtName} breadcrumbs={crumbs} />

      <div className="invoice-toolbar">
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="receipt" size={18} />
          Tải PDF / In
        </button>
        <Link to={`/keo/${post.id}`} className="btn btn--outline">
          Quay lại kèo
        </Link>
        <p className="hint">Trong hộp thoại in, chọn máy in "Lưu dưới dạng PDF" (Save as PDF).</p>
      </div>

      <article className="invoice" aria-label="Hóa đơn">
        <header className="invoice__head">
          <div>
            <p className="invoice__brand">Badminton Matching</p>
            <h1 className="invoice__title">Hóa đơn kèo cầu lông</h1>
          </div>
          <dl className="invoice__meta">
            <div>
              <dt>Mã kèo</dt>
              <dd>{shortCode(post.id)}</dd>
            </div>
            <div>
              <dt>Ngày xuất</dt>
              <dd>{issuedAt.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</dd>
            </div>
          </dl>
        </header>

        <section className="invoice__section">
          <dl className="invoice__info">
            <div>
              <dt>Sân</dt>
              <dd>{post.courtName}</dd>
            </div>
            <div>
              <dt>Thời gian</dt>
              <dd>{formatTimeRange(post.startsAt, post.endsAt)}</dd>
            </div>
            <div>
              <dt>Khu vực</dt>
              <dd>{post.address ? `${post.address}, ${post.district}` : post.district}</dd>
            </div>
            <div>
              <dt>Chủ kèo</dt>
              <dd>{post.author.displayName}</dd>
            </div>
          </dl>
        </section>

        <section className="invoice__section">
          <h2 className="invoice__h2">Các khoản chi</h2>
          {costs.expenses.length === 0 ? (
            <p className="hint">Chủ kèo chưa nhập khoản chi nào.</p>
          ) : (
            <table className="invoice__table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Khoản</th>
                  <th scope="col">Chi tiết</th>
                  <th scope="col" className="num">
                    Số tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {costs.expenses.map((e, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      {expenseName(e)}
                      {e.shuttleName && <span className="invoice__sub">{e.shuttleName}</span>}
                    </td>
                    <td>
                      {e.quantity != null && e.unitPrice != null && (
                        <span className="invoice__sub invoice__sub--first">
                          {e.quantity} quả × {formatMoney(e.unitPrice)}
                        </span>
                      )}
                      <span className="invoice__sub invoice__sub--first">
                        {e.everyone
                          ? `Tất cả (${e.sharers.length} người)`
                          : e.sharers.map((r) => nameOf.get(r) ?? '?').join(', ')}{' '}
                        · {formatMoney(e.share)}/người
                      </span>
                    </td>
                    <td className="num">{formatMoney(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    Tổng cộng
                  </th>
                  <td className="num">
                    <strong>{formatMoney(costs.total)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {costs.expenses.length > 0 && (
          <section className="invoice__section">
            <h2 className="invoice__h2">Mỗi người phải trả</h2>
            <table className="invoice__table">
              <thead>
                <tr>
                  <th scope="col">Người</th>
                  <th scope="col">Loại</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="num">
                    Phải trả
                  </th>
                </tr>
              </thead>
              <tbody>
                {costs.members.map((m) => (
                  <tr key={m.ref}>
                    <td>{m.name}</td>
                    <td>{memberType(m)}</td>
                    <td>{m.type === 'user' ? STATUS[m.status ?? 'none'](m.diff ?? 0) : '—'}</td>
                    <td className="num">{formatMoney(m.due ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pay && pay.summary.participantCount > 0 && (
              <p className="invoice__note">
                Đã thu {pay.summary.paidCount}/{pay.summary.participantCount} người qua app ·{' '}
                {formatMoney(pay.summary.collected)} / {formatMoney(pay.summary.expected)}
              </p>
            )}
          </section>
        )}

        {pay?.bank && pay.accountNumber && (
          <section className="invoice__section">
            <h2 className="invoice__h2">Chuyển khoản cho chủ kèo</h2>
            <dl className="invoice__info">
              <div>
                <dt>Ngân hàng</dt>
                <dd>{pay.bank.shortName}</dd>
              </div>
              <div>
                <dt>Số tài khoản</dt>
                <dd>{pay.accountNumber}</dd>
              </div>
              <div>
                <dt>Chủ tài khoản</dt>
                <dd>{pay.accountName}</dd>
              </div>
            </dl>
          </section>
        )}

        {(post.bills?.length ?? 0) > 0 && (
          <section className="invoice__section invoice__bills">
            <h2 className="invoice__h2">Ảnh bill ({post.bills!.length})</h2>
            <div className="invoice__bill-grid">
              {post.bills!.map((b, i) => (
                <img key={b.file} src={b.url} alt={`Ảnh bill ${i + 1}`} />
              ))}
            </div>
          </section>
        )}

        <footer className="invoice__foot">
          Hóa đơn tham khảo để chia tiền trong kèo, do chủ kèo nhập trên Badminton Matching; không phải hóa đơn giá trị
          gia tăng. Tiền chuyển thẳng giữa các tài khoản ngân hàng, hệ thống không giữ tiền.
        </footer>
      </article>
    </>
  );
}
