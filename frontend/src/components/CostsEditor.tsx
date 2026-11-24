import { useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import { shuttlesApi } from '../api/shuttles';
import type { ExpenseKind, MemberRef, PostDetail, Shuttle } from '../types';
import { EXPENSE_ICONS, EXPENSE_KINDS, previewDues, shuttleAmount } from '../utils/costs';
import { formatMoney } from '../utils/format';
import Icon from './Icon';
import { Alert, Avatar } from './ui';

interface DraftRow {
  id: string;
  kind: ExpenseKind;
  label: string;
  amount: string;
  everyone: boolean;
  sharedBy: MemberRef[];
  /** Khoản "Cầu" tính theo số quả (WBS 4.10); false = khoản cầu cũ nhập thẳng số tiền */
  byCount: boolean;
  quantity: string;
  unitPrice: string;
  /** Loại cầu trong kho; null = nhập giá tay */
  shuttleId: string | null;
  shuttleName: string | null;
}

interface Member {
  ref: MemberRef;
  name: string;
  type: 'host' | 'user' | 'guest';
  avatarUrl?: string | null;
}

let tempKey = 0;
const newKey = () => `moi-${Date.now()}-${++tempKey}`;

/** "Tiền sân" → "Sân" cho ô bấm thêm khoản */
const tileLabel = (label: string) => {
  const s = label.replace(/^Tiền /, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const TAGS = { host: 'Chủ kèo', guest: 'Không dùng app', user: null } as const;

/** Vuốt trái quá ngưỡng này (px) thì mở nút xóa phía sau khoản chi */
const SWIPE_OPEN = 60;
const SWIPE_WIDTH = 88;

/**
 * Một khoản chi: trên điện thoại vuốt trái để lộ nút "Xóa" phía sau; máy tính dùng nút thùng rác.
 * Bắt đầu vuốt trên ô nhập thì bỏ qua, để gõ / chọn chữ bình thường.
 */
function SwipeRow({ onDelete, label, children }: { onDelete: () => void; label: string; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; swiping: boolean | null } | null>(null);
  const swiped = useRef(false);

  function onTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, base: open ? -SWIPE_WIDTH : 0, swiping: null };
    swiped.current = false;
  }

  function onTouchMove(e: TouchEvent) {
    const s = start.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Quyết định một lần: vuốt ngang (xóa) hay cuộn dọc trang
    if (s.swiping === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.swiping = Math.abs(dx) > Math.abs(dy);
    if (!s.swiping) return;
    swiped.current = true;
    setOffset(Math.max(-SWIPE_WIDTH - 24, Math.min(0, s.base + dx)));
  }

  function onTouchEnd() {
    const s = start.current;
    start.current = null;
    if (!s?.swiping) return;
    const isOpen = offset < -SWIPE_OPEN;
    setOpen(isOpen);
    setOffset(isOpen ? -SWIPE_WIDTH : 0);
  }

  return (
    <div className={`swipe-row${open ? ' swipe-row--open' : ''}`}>
      <button
        type="button"
        className="swipe-row__delete"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={onDelete}
      >
        <Icon name="trash" size={20} />
        Xóa
      </button>
      <div
        className="swipe-row__content"
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        // Vừa vuốt xong thì không tính là bấm (tránh tích nhầm người)
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
        aria-label={label}
        role="group"
      >
        {children}
      </div>
    </div>
  );
}

/** Khung sửa chi phí (chỉ chủ kèo, WBS 4.8.2): bấm để tích người, bấm ô để thêm khoản */
export default function CostsEditor({
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
  const [adding, setAdding] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [rows, setRows] = useState<DraftRow[]>(() =>
    costs.expenses.map((e) => ({
      id: newKey(),
      kind: e.kind,
      label: e.label ?? '',
      amount: String(e.amount),
      everyone: e.everyone,
      sharedBy: e.sharedBy,
      byCount: e.kind === 'shuttle' && e.quantity != null,
      quantity: e.quantity != null ? String(e.quantity) : '',
      unitPrice: e.unitPrice != null ? String(e.unitPrice) : '',
      shuttleId: e.shuttleId ?? null,
      shuttleName: e.shuttleName ?? null,
    })),
  );
  // Kho cầu của chủ kèo (chọn loại cầu cho khoản "Cầu")
  const [stock, setStock] = useState<Shuttle[]>([]);
  useEffect(() => {
    shuttlesApi
      .list()
      .then(setStock)
      .catch(() => setStock([]));
  }, []);
  // Số quả mỗi loại cầu đã trừ ở lần lưu trước: được tính lại vào "còn trong kho" khi sửa
  const savedUsage = new Map<string, number>();
  for (const e of costs.expenses) {
    if (e.shuttleId && e.quantity) savedUsage.set(e.shuttleId, (savedUsage.get(e.shuttleId) ?? 0) + e.quantity);
  }
  // "Ai chơi hôm nay": người được chọn sẵn cho khoản thêm mới (không phải điểm danh)
  const [unticked, setUnticked] = useState<Set<MemberRef>>(() => new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hostName = costs.members.find((m) => m.type === 'host')?.name ?? 'Chủ kèo';
  const members: Member[] = [
    { ref: 'host', name: hostName, type: 'host', avatarUrl: post.author.avatarUrl },
    ...post.participants.map((p) => ({
      ref: `u:${p.id}`,
      name: p.displayName,
      type: 'user' as const,
      avatarUrl: p.avatarUrl,
    })),
    ...guests.map((g) => ({ ref: `g:${g.key}`, name: g.name, type: 'guest' as const })),
  ];
  const refs = members.map((m) => m.ref);
  const ticked = refs.filter((r) => !unticked.has(r));

  const amountOf = (r: DraftRow) => {
    if (!r.byCount) return Number(r.amount) || 0;
    const q = Number(r.quantity);
    const u = Number(r.unitPrice);
    return q > 0 && u >= 0 ? shuttleAmount(q, u) : 0;
  };

  /** Số quả cần thêm so với kho (kể cả các khoản cầu khác cùng loại); > 0 thì cảnh báo nhỏ, không chặn lưu */
  const shortOf = (r: DraftRow) => {
    const s = r.shuttleId ? stock.find((x) => x.id === r.shuttleId) : undefined;
    if (!s) return null;
    const used = rows
      .filter((x) => x.byCount && x.shuttleId === s.id)
      .reduce((n, x) => n + (Number(x.quantity) || 0), 0);
    const available = s.quantity + (savedUsage.get(s.id) ?? 0);
    return used > available ? available : null;
  };

  const dues = previewDues(
    refs,
    rows.map((r) => ({ amount: amountOf(r), everyone: r.everyone, sharedBy: r.sharedBy })),
  );
  const total = rows.reduce((sum, r) => sum + amountOf(r), 0);

  const setRow = (id: string, patch: Partial<DraftRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const sharersOf = (r: DraftRow) => (r.everyone ? refs : r.sharedBy.filter((x) => refs.includes(x)));

  function toggleTick(ref: MemberRef) {
    setUnticked((s) => {
      const next = new Set(s);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }

  function addRow(kind: ExpenseKind) {
    const id = newKey();
    const all = ticked.length === refs.length;
    const first = kind === 'shuttle' ? stock[0] : undefined;
    setRows((rs) => [
      ...rs,
      {
        id,
        kind,
        label: '',
        amount: '',
        everyone: all,
        sharedBy: all ? [] : ticked,
        byCount: kind === 'shuttle',
        quantity: '',
        unitPrice: first ? String(first.unitPrice) : '',
        shuttleId: first?.id ?? null,
        shuttleName: first?.name ?? null,
      },
    ]);
    setFocusId(id);
  }

  /** Bấm một người trong khoản: đang "Tất cả" thì chuyển sang danh sách cụ thể bỏ người đó */
  function toggleSharer(r: DraftRow, ref: MemberRef) {
    const current = sharersOf(r);
    const next = current.includes(ref) ? current.filter((x) => x !== ref) : [...current, ref];
    setRow(r.id, { everyone: false, sharedBy: next });
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    setGuests((g) => [...g, { key: newKey(), name }]);
    setGuestName('');
    setAdding(false);
  }

  function removeGuest(key: string) {
    const ref = `g:${key}`;
    setGuests((g) => g.filter((x) => x.key !== key));
    setRows((rs) => rs.map((r) => ({ ...r, sharedBy: r.sharedBy.filter((x) => x !== ref) })));
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
          everyone: r.everyone,
          sharedBy: r.everyone ? [] : r.sharedBy.filter((x) => refs.includes(x)),
          // Khoản "Cầu" theo số quả: server tự tính số tiền
          ...(r.byCount
            ? { quantity: Number(r.quantity), unitPrice: Number(r.unitPrice), shuttleId: r.shuttleId }
            : { amount: Number(r.amount) || 0 }),
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
    <form onSubmit={handleSubmit} className="stack costs-editor" aria-label="Sửa chi phí">
      {error && <Alert>{error}</Alert>}

      {/* Ai chơi hôm nay */}
      <section aria-label="Ai chơi hôm nay">
        <div className="costs-editor__head">
          <h3 className="costs-editor__title">Ai chơi hôm nay</h3>
          <span className="badge badge--open">{ticked.length} người</span>
        </div>
        <div className="people-tiles">
          {members.map((m) => {
            const on = !unticked.has(m.ref);
            return (
              <div key={m.ref} className={`person-tile${on ? ' person-tile--on' : ''}`}>
                <button
                  type="button"
                  className="person-tile__main"
                  aria-pressed={on}
                  aria-label={`${m.name}${on ? ', đã chọn' : ''}`}
                  onClick={() => toggleTick(m.ref)}
                >
                  <span className="person-tile__avatar">
                    <Avatar name={m.name} url={m.avatarUrl} />
                    {on && (
                      <span className="tick" aria-hidden="true">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </span>
                  <span className="person-tile__name">{m.name}</span>
                  {TAGS[m.type] && <span className="person-tile__tag">{TAGS[m.type]}</span>}
                </button>
                {m.type === 'guest' && (
                  <button
                    type="button"
                    className="person-tile__remove"
                    aria-label={`Xóa ${m.name}`}
                    onClick={() => removeGuest(m.ref.slice(2))}
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="person-tile person-tile--add"
            aria-expanded={adding}
            onClick={() => setAdding((v) => !v)}
          >
            <span className="person-tile__avatar person-tile__avatar--add">
              <Icon name="userPlus" size={22} />
            </span>
            <span className="person-tile__name">Thêm</span>
            <span className="person-tile__tag">Không dùng app</span>
          </button>
        </div>
        {adding && (
          <div className="inline-add">
            <input
              className="input"
              placeholder="Tên bạn không dùng app, ví dụ: Tuấn"
              maxLength={30}
              autoFocus
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
        )}
        <p className="hint">
          Bỏ tích người không chơi: khoản thêm sau sẽ không tính họ. Bạn tự thu tiền mặt của bạn không dùng app.
        </p>
      </section>

      {/* Thêm khoản chi */}
      <section aria-label="Thêm khoản chi">
        <h3 className="costs-editor__title">Thêm khoản chi</h3>
        <div className="kind-tiles">
          {EXPENSE_KINDS.map((k) => {
            const count = rows.filter((r) => r.kind === k.kind).length;
            return (
              <button
                key={k.kind}
                type="button"
                className="kind-tile"
                aria-label={`Thêm ${k.label.toLowerCase()}`}
                onClick={() => addRow(k.kind)}
              >
                {count > 0 && <span className="kind-tile__count">{count}</span>}
                <Icon name={EXPENSE_ICONS[k.kind]} size={24} />
                <span>{tileLabel(k.label)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Danh sách khoản */}
      <section aria-label="Khoản chi">
        <div className="costs-editor__head">
          <h3 className="costs-editor__title">Khoản chi · {rows.length}</h3>
          {rows.length > 0 && <span className="hint costs-editor__swipe-hint">Vuốt trái để xóa</span>}
        </div>
        {rows.length === 0 ? (
          <p className="empty-box">
            Chưa có khoản nào.
            <br />
            Chạm Sân, Cầu, Ăn… ở trên để thêm.
          </p>
        ) : (
          <div className="stack stack--tight">
            {rows.map((r, i) => {
              const sharers = sharersOf(r);
              const amount = amountOf(r);
              const short = r.byCount ? shortOf(r) : null;
              const inStock = r.shuttleId ? stock.some((s) => s.id === r.shuttleId) : false;
              const kindLabel = EXPENSE_KINDS.find((k) => k.kind === r.kind)!.label;
              return (
                <SwipeRow
                  key={r.id}
                  label={`Khoản ${i + 1}: ${kindLabel}`}
                  onDelete={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                >
                  <div className="expense-edit" data-kind={r.kind}>
                    <div className="expense-edit__top">
                      <span className="icon-chip">
                        <Icon name={EXPENSE_ICONS[r.kind]} size={18} />
                      </span>
                      {r.kind === 'other' ? (
                        <input
                          id={`label-${i}`}
                          className="input expense-edit__label"
                          aria-label="Tên khoản"
                          required
                          maxLength={40}
                          placeholder="Tên khoản, ví dụ: Gửi xe"
                          value={r.label}
                          onChange={(e) => setRow(r.id, { label: e.target.value })}
                        />
                      ) : (
                        <span className="expense-edit__name">{kindLabel}</span>
                      )}
                      {r.byCount ? (
                        <strong className="expense-edit__computed" aria-live="polite">
                          {formatMoney(amount)}
                        </strong>
                      ) : (
                        <input
                          id={`amount-${i}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1000}
                          required
                          aria-label={`Số tiền ${kindLabel.toLowerCase()} (đồng)`}
                          placeholder="Số tiền"
                          className="input expense-edit__amount"
                          autoFocus={r.id === focusId}
                          value={r.amount}
                          onChange={(e) => setRow(r.id, { amount: e.target.value })}
                        />
                      )}
                      <button
                        type="button"
                        className="icon-btn expense-edit__remove"
                        aria-label={`Xóa khoản ${i + 1}`}
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                    {r.byCount && (
                      <div className="shuttle-pick">
                        <select
                          id={`shuttle-${i}`}
                          className="input"
                          aria-label="Loại cầu"
                          value={r.shuttleId ?? 'manual'}
                          onChange={(e) => {
                            const s = stock.find((x) => x.id === e.target.value);
                            if (s)
                              setRow(r.id, { shuttleId: s.id, shuttleName: s.name, unitPrice: String(s.unitPrice) });
                            else setRow(r.id, { shuttleId: null, shuttleName: null });
                          }}
                        >
                          {stock.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} · {formatMoney(s.unitPrice)}/quả · còn {s.quantity}
                            </option>
                          ))}
                          {r.shuttleId && !inStock && (
                            <option value={r.shuttleId}>{r.shuttleName ?? 'Loại cầu'} (đã xóa khỏi kho)</option>
                          )}
                          <option value="manual">Nhập giá tay (không trừ kho)</option>
                        </select>
                        <label className="shuttle-pick__field">
                          <input
                            id={`qty-${i}`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={500}
                            required
                            className="input"
                            placeholder="0"
                            autoFocus={r.id === focusId}
                            value={r.quantity}
                            onChange={(e) => setRow(r.id, { quantity: e.target.value })}
                          />
                          <span>quả</span>
                        </label>
                        {!r.shuttleId && (
                          <label className="shuttle-pick__field">
                            <input
                              id={`unit-${i}`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={500}
                              required
                              className="input"
                              placeholder="Giá"
                              value={r.unitPrice}
                              onChange={(e) => setRow(r.id, { unitPrice: e.target.value })}
                            />
                            <span>đ/quả</span>
                          </label>
                        )}
                        {Number(r.quantity) > 0 && r.unitPrice !== '' && (
                          <p className="shuttle-pick__calc">
                            {r.quantity} quả × {formatMoney(Number(r.unitPrice))} = {formatMoney(amount)}
                          </p>
                        )}
                        {short !== null && (
                          <p className="shuttle-pick__warn" role="status">
                            <Icon name="info" size={14} />
                            Kho chỉ còn {short} quả, có thể bạn chưa cập nhật. Vẫn lưu được; kho dừng ở 0.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="sharer-chips" role="group" aria-label="Ai cùng chịu">
                      <button
                        type="button"
                        className={`sharer-chip sharer-chip--all${r.everyone ? ' sharer-chip--on' : ''}`}
                        aria-pressed={r.everyone}
                        title="Gồm cả người vào sau"
                        onClick={() =>
                          setRow(
                            r.id,
                            r.everyone ? { everyone: false, sharedBy: refs } : { everyone: true, sharedBy: [] },
                          )
                        }
                      >
                        {r.everyone && <Icon name="check" size={14} />}
                        Tất cả
                      </button>
                      {members.map((m) => {
                        const on = sharers.includes(m.ref);
                        return (
                          <button
                            key={m.ref}
                            type="button"
                            className={`sharer-chip${on ? ' sharer-chip--on' : ''}`}
                            aria-pressed={on}
                            onClick={() => toggleSharer(r, m.ref)}
                          >
                            <Avatar name={m.name} url={m.avatarUrl} size="xs" />
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="expense-edit__share">
                      {sharers.length === 0
                        ? 'Chưa chọn ai cùng chịu'
                        : `${formatMoney(Math.ceil(amount / sharers.length))} / người · ${sharers.length} người`}
                    </p>
                  </div>
                </SwipeRow>
              );
            })}
          </div>
        )}
      </section>

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
