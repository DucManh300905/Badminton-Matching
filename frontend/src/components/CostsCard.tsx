import { useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import type { CostMember, ExpenseKind, MemberRef, PostDetail } from '../types';
import { EXPENSE_KINDS, expenseName, previewDues } from '../utils/costs';
import { formatMoney } from '../utils/format';
import { Alert } from './ui';

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
/* Chế độ sửa (chỉ chủ kèo)                                           */
/* ------------------------------------------------------------------ */

interface DraftRow {
  kind: ExpenseKind;
  label: string;
  amount: string;
  everyone: boolean;
  sharedBy: MemberRef[];
}

let tempKey = 0;
const newKey = () => `moi-${Date.now()}-${++tempKey}`;

function CostsEditor({
  post,
  onSaved,
  onCancel,
}: {
  post: PostDetail;
  onSaved: (p: PostDetail) => void;
  onCancel: () => void;
}) {
  const costs = post.costs!;
  const [guests, setGuests] = useState(costs.guests.map((g) => ({ key: g.id, name: g.name })));
  const [guestName, setGuestName] = useState('');
  const [rows, setRows] = useState<DraftRow[]>(() =>
    costs.expenses.length > 0
      ? costs.expenses.map((e) => ({
          kind: e.kind,
          label: e.label ?? '',
          amount: String(e.amount),
          everyone: e.everyone,
          sharedBy: e.sharedBy,
        }))
      : [{ kind: 'court', label: '', amount: '', everyone: true, sharedBy: [] }],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hostName = costs.members.find((m) => m.type === 'host')?.name ?? 'Chủ kèo';
  const members: { ref: MemberRef; name: string; type: string }[] = [
    { ref: 'host', name: hostName, type: 'host' },
    ...post.participants.map((p) => ({ ref: `u:${p.id}`, name: p.displayName, type: 'user' })),
    ...guests.map((g) => ({ ref: `g:${g.key}`, name: g.name, type: 'guest' })),
  ];
  const refs = members.map((m) => m.ref);

  const dues = previewDues(
    refs,
    rows.map((r) => ({ amount: Number(r.amount) || 0, everyone: r.everyone, sharedBy: r.sharedBy })),
  );
  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const setRow = (i: number, patch: Partial<DraftRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const toggleSharer = (i: number, ref: MemberRef) =>
    setRows((rs) =>
      rs.map((r, j) =>
        j === i
          ? { ...r, sharedBy: r.sharedBy.includes(ref) ? r.sharedBy.filter((x) => x !== ref) : [...r.sharedBy, ref] }
          : r,
      ),
    );

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    setGuests((g) => [...g, { key: newKey(), name }]);
    setGuestName('');
  }

  function removeGuest(key: string) {
    setGuests((g) => g.filter((x) => x.key !== key));
    setRows((rs) => rs.map((r) => ({ ...r, sharedBy: r.sharedBy.filter((x) => x !== `g:${key}`) })));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await postsApi.updateCosts(post.id, {
        guests,
        expenses: rows.map((r) => ({
          kind: r.kind,
          label: r.kind === 'other' ? r.label.trim() : undefined,
          amount: Number(r.amount) || 0,
          everyone: r.everyone,
          sharedBy: r.everyone ? [] : r.sharedBy.filter((x) => refs.includes(x)),
        })),
      });
      onSaved(updated);
    } catch (err) {
      const info = toApiError(err);
      setError(Object.values(info.fields)[0] ?? info.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack" aria-label="Sửa chi phí">
      {error && <Alert>{error}</Alert>}

      <fieldset className="costs-guests">
        <legend className="label">Bạn của bạn không dùng app</legend>
        <p className="hint">Thêm tên để họ được tính khi chia tiền. Bạn tự thu tiền mặt của họ.</p>
        {guests.length > 0 && (
          <ul className="chip-list">
            {guests.map((g) => (
              <li key={g.key} className="chip-tag">
                {g.name}
                <button type="button" aria-label={`Xóa ${g.name}`} onClick={() => removeGuest(g.key)}>
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="inline-add">
          <input
            className="input"
            placeholder="Tên, ví dụ: Tuấn"
            maxLength={30}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addGuest();
              }
            }}
          />
          <button type="button" className="btn btn--outline" onClick={addGuest} disabled={!guestName.trim()}>
            Thêm
          </button>
        </div>
      </fieldset>

      {rows.map((r, i) => (
        <fieldset key={i} className="expense-edit">
          <legend className="sr-only">Khoản {i + 1}</legend>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor={`kind-${i}`}>
                Khoản {i + 1}
              </label>
              <select
                id={`kind-${i}`}
                className="input"
                value={r.kind}
                onChange={(e) => setRow(i, { kind: e.target.value as ExpenseKind })}
              >
                {EXPENSE_KINDS.map((k) => (
                  <option key={k.kind} value={k.kind}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor={`amount-${i}`}>
                Số tiền (đồng)
              </label>
              <input
                id={`amount-${i}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                required
                className="input"
                value={r.amount}
                onChange={(e) => setRow(i, { amount: e.target.value })}
              />
            </div>
          </div>
          {r.kind === 'other' && (
            <div className="field">
              <label className="label" htmlFor={`label-${i}`}>
                Tên khoản
              </label>
              <input
                id={`label-${i}`}
                className="input"
                required
                maxLength={40}
                placeholder="Ví dụ: Gửi xe"
                value={r.label}
                onChange={(e) => setRow(i, { label: e.target.value })}
              />
            </div>
          )}
          <div className="sharers">
            <span className="label">Ai cùng chịu?</span>
            <label className="checkbox sharers__all">
              <input
                type="checkbox"
                checked={r.everyone}
                onChange={(e) => setRow(i, { everyone: e.target.checked, sharedBy: e.target.checked ? [] : refs })}
              />
              <span>Chọn tất cả (gồm cả người vào sau)</span>
            </label>
            <div className="sharers__list">
              {members.map((m) => (
                <label key={m.ref} className={`checkbox${r.everyone ? ' checkbox--muted' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={r.everyone}
                    checked={r.everyone || r.sharedBy.includes(m.ref)}
                    onChange={() => toggleSharer(i, m.ref)}
                  />
                  <span>
                    {m.name} {memberTag(m) && <span className="hint">({memberTag(m)})</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--link expense-edit__remove"
            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
          >
            Xóa khoản này
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        className="btn btn--outline btn--block"
        onClick={() =>
          setRows((rs) => [...rs, { kind: 'shuttle', label: '', amount: '', everyone: true, sharedBy: [] }])
        }
      >
        Thêm khoản
      </button>

      <div className="settle-preview">
        <p>
          Tổng <strong>{formatMoney(total)}</strong>. Mỗi người phải trả:
        </p>
        <ul className="due-preview">
          {members.map((m) => (
            <li key={m.ref}>
              <span>{m.name}</span>
              <strong>{formatMoney(dues?.get(m.ref) ?? 0)}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="form-footer">
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>
          Hủy
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu chi phí'}
        </button>
      </div>
    </form>
  );
}

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
        <h2 className="card__title mt-0">Chi phí kèo</h2>
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
                    <div>
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
      <h2 className="card__title mt-0">Điểm danh</h2>
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
