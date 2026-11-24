import { useState } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import type { CostMember, PostDetail } from '../types';
import { EXPENSE_ICONS, expenseName } from '../utils/costs';
import CostsEditor from './CostsEditor';
import Icon from './Icon';
import { formatMoney } from '../utils/format';
import { Alert, CardTitle } from './ui';

const STATUS_TEXT: Record<string, (diff: number) => string> = {
  unpaid: () => 'Chưa trả',
  paid: () => 'Đã trả',
  owe: (d) => `Còn thiếu ${formatMoney(d)}`,
  overpaid: (d) => `Trả dư ${formatMoney(d)}`,
};

const STATUS_TONE: Record<string, string> = { unpaid: 'full', paid: 'open', owe: 'closed', overpaid: 'open' };

function MemberStatus({ m }: { m: CostMember }) {
  if (m.type !== 'user' || !m.status || m.status === 'none') return null;
  return <span className={`badge badge--${STATUS_TONE[m.status]}`}>{STATUS_TEXT[m.status](m.diff ?? 0)}</span>;
}

const memberTag = (m: { type: string }) =>
  m.type === 'host' ? 'Chủ kèo' : m.type === 'guest' ? 'Không dùng app' : null;

/* ------------------------------------------------------------------ */
/* Chế độ xem (mọi người trong kèo)                                   */
/* ------------------------------------------------------------------ */

/** Thẻ "Chi phí kèo" (WBS 4.8.2): ai trong kèo cũng xem được, chỉ chủ kèo sửa */
export default function CostsCard({
  post,
  isAuthor,
  onSaved,
}: {
  post: PostDetail;
  isAuthor: boolean;
  onSaved: (p: PostDetail) => void;
}) {
  const costs = post.costs;
  const [editing, setEditing] = useState(false);
  if (!costs) return null;

  const nameOf = new Map(costs.members.map((m) => [m.ref, m.name]));
  const canEdit = isAuthor && !!post.payment?.canEditCosts;

  return (
    <section className="card stack" aria-label="Chi phí kèo">
      <div className="action-card__status">
        <CardTitle icon="receipt" className="mt-0">
          Chi phí kèo
        </CardTitle>
        {costs.expenses.length > 0 && <strong className="costs-total">{formatMoney(costs.total)}</strong>}
      </div>

      {editing ? (
        <CostsEditor
          post={post}
          onCancel={() => setEditing(false)}
          onSaved={(p) => {
            onSaved(p);
            setEditing(false);
          }}
        />
      ) : (
        <>
          {costs.expenses.length === 0 ? (
            <p className="hint">
              {isAuthor
                ? 'Chưa có khoản chi nào. Thêm tiền sân, cầu, nước, ăn… và chọn ai cùng chịu từng khoản; mã QR của người chơi sẽ hiện theo đúng số tiền của họ.'
                : `Chủ kèo chưa nhập chi phí. Chi phí dự kiến khoảng ${formatMoney(post.pricePerPerson)}/người.`}
            </p>
          ) : (
            <>
              <ul className="expense-list">
                {costs.expenses.map((e, i) => (
                  <li key={i}>
                    <span className="icon-chip">
                      <Icon name={EXPENSE_ICONS[e.kind]} size={18} />
                    </span>
                    <div className="expense-list__body">
                      <p className="expense-list__name">{expenseName(e)}</p>
                      <p className="people__info">
                        {e.everyone
                          ? `Tất cả (${e.sharers.length} người)`
                          : e.sharers.map((r) => nameOf.get(r) ?? '?').join(', ')}{' '}
                        · {formatMoney(e.share)}/người
                      </p>
                    </div>
                    <strong>{formatMoney(e.amount)}</strong>
                  </li>
                ))}
              </ul>
              <h3 className="label">Mỗi người phải trả</h3>
              <ul className="due-list">
                {costs.members.map((m) => (
                  <li key={m.ref}>
                    <span>
                      {m.name} {memberTag(m) && <span className="hint">({memberTag(m)})</span>}
                    </span>
                    <span className="due-list__right">
                      <MemberStatus m={m} />
                      <strong>{formatMoney(m.due ?? 0)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {canEdit && (
            <button type="button" className="btn btn--primary btn--block" onClick={() => setEditing(true)}>
              {costs.expenses.length === 0 ? 'Thêm chi phí' : 'Sửa chi phí'}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** Điểm danh (chủ kèo, từ giờ bắt đầu): số liệu bùng kèo cho nghiên cứu */
export function AttendanceCard({ post, onSaved }: { post: PostDetail; onSaved: (p: PostDetail) => void }) {
  const [marks, setMarks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(post.participants.map((p) => [p.id, p.attended ?? true])),
  );
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (post.participants.length === 0) return null;

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      onSaved(
        await postsApi.setAttendance(
          post.id,
          post.participants.map((p) => ({ userId: p.id, attended: marks[p.id] })),
        ),
      );
      setMessage({ tone: 'success', text: 'Đã lưu điểm danh.' });
    } catch (err) {
      setMessage({ tone: 'error', text: toApiError(err).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack" aria-label="Điểm danh">
      <CardTitle icon="check" className="mt-0">
        Điểm danh
      </CardTitle>
      <p className="hint">
        Bỏ tích người không đến. Muốn họ vẫn chịu tiền sân thì giữ họ trong khoản đó ở phần chi phí.
      </p>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {post.participants.map((p) => (
        <label key={p.id} className="checkbox">
          <input
            type="checkbox"
            checked={marks[p.id]}
            onChange={(e) => setMarks((m) => ({ ...m, [p.id]: e.target.checked }))}
          />
          <span>
            {p.displayName} {marks[p.id] ? '' : <span className="hint">(vắng)</span>}
          </span>
        </label>
      ))}
      <div className="form-footer">
        <button type="button" className="btn btn--outline" disabled={busy} onClick={save}>
          {busy ? 'Đang lưu…' : 'Lưu điểm danh'}
        </button>
      </div>
    </section>
  );
}
