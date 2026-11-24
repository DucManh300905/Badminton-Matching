import { useEffect, useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { shuttlesApi } from '../api/shuttles';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { Alert, CardTitle, Spinner } from '../components/ui';
import type { Shuttle, ShuttleStats } from '../types';
import { formatMoney } from '../utils/format';

/** Số quả chọn nhanh (1, 2, 3 ống) */
const QUICK = [12, 24, 36];

/** Ô chọn số quả: 3 nút chọn nhanh + ô tự nhập */
function QuantityPicker({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="label" id={`${id}-label`}>
        Số quả
      </span>
      <div className="quick-qty" role="group" aria-labelledby={`${id}-label`}>
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            className={`quick-qty__btn${value === String(q) ? ' quick-qty__btn--on' : ''}`}
            aria-pressed={value === String(q)}
            onClick={() => onChange(String(q))}
          >
            {q} quả
          </button>
        ))}
      </div>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={1000}
        className="input"
        placeholder="Hoặc tự nhập số quả"
        aria-label="Tự nhập số quả"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Số quả + tổng tiền, xem trước giá mỗi quả. Dùng cho "Thêm loại cầu" và "Nhập thêm" */
function StockForm({
  idPrefix,
  withName,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  withName?: boolean;
  submitLabel: string;
  onSubmit: (v: { name: string; quantity: number; totalPrice: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('12');
  const [total, setTotal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = Number(quantity);
  const t = Number(total);
  const valid = Number.isInteger(q) && q >= 1 && q <= 1000 && total !== '' && t >= 0 && (!withName || !!name.trim());

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), quantity: q, totalPrice: Math.round(t) });
    } catch (err) {
      const info = toApiError(err);
      setError(Object.values(info.fields)[0] ?? info.message);
      setBusy(false);
    }
  }

  return (
    <form className="stock-form stack stack--tight" onSubmit={handle}>
      {error && <Alert>{error}</Alert>}
      {withName && (
        <div className="field">
          <label className="label" htmlFor={`${idPrefix}-name`}>
            Tên loại cầu
          </label>
          <input
            id={`${idPrefix}-name`}
            className="input"
            maxLength={40}
            required
            placeholder="Ví dụ: Thành Công 77"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <QuantityPicker id={`${idPrefix}-qty`} value={quantity} onChange={setQuantity} />
      <div className="field">
        <label className="label" htmlFor={`${idPrefix}-total`}>
          Tổng tiền đã trả (đồng)
        </label>
        <input
          id={`${idPrefix}-total`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          required
          className="input"
          placeholder="Ví dụ: 560000"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
        {valid && q > 0 && <p className="hint">Tương đương {formatMoney(Math.round(t / q))} mỗi quả</p>}
      </div>
      <div className="form-footer">
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>
          Hủy
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy || !valid}>
          {busy ? 'Đang lưu…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Thanh mức cầu: 100% = số quả sau lần nhập gần nhất; vàng dưới 25%, đỏ dưới 10% */
export function StockLevel({ quantity, full }: { quantity: number; full: number }) {
  const pct = full > 0 ? Math.min(100, Math.round((quantity / full) * 100)) : 0;
  const tone = pct < 10 ? 'low' : pct < 25 ? 'warn' : 'ok';
  return (
    <div
      className={`stock-level stock-level--${tone}`}
      role="progressbar"
      aria-label="Mức cầu còn lại"
      aria-valuemin={0}
      aria-valuemax={full}
      aria-valuenow={quantity}
      aria-valuetext={`Còn ${quantity} / ${full} quả`}
    >
      <span className="stock-level__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ShuttleCard({
  s,
  onChanged,
  onRemoved,
}: {
  s: Shuttle;
  onChanged: (s: Shuttle) => void;
  onRemoved: () => void;
}) {
  const [mode, setMode] = useState<'view' | 'restock' | 'edit'>('view');
  const [name, setName] = useState(s.name);
  const [count, setCount] = useState(String(s.quantity));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onChanged(await shuttlesApi.update(s.id, { name: name.trim(), quantity: Number(count) }));
      setMode('view');
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Xóa "${s.name}" khỏi kho? Các khoản cầu đã lưu trong kèo vẫn giữ nguyên.`)) return;
    try {
      await shuttlesApi.remove(s.id);
      onRemoved();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  const low = s.fullLevel > 0 && s.quantity / s.fullLevel < 0.25;

  return (
    <li className="card shuttle-card">
      <div className="shuttle-card__head">
        <span className="icon-chip">
          <Icon name="shuttle" size={20} />
        </span>
        <div className="shuttle-card__title">
          <h2 className="shuttle-card__name">{s.name}</h2>
          <p className="hint">{formatMoney(s.unitPrice)} / quả</p>
        </div>
        <p className="shuttle-card__qty">
          <strong>{s.quantity}</strong> quả
        </p>
      </div>
      <StockLevel quantity={s.quantity} full={s.fullLevel} />
      <p className="hint shuttle-card__level">
        {s.quantity === 0
          ? 'Đã hết cầu'
          : low
            ? 'Sắp hết cầu'
            : `Còn ${s.quantity} / ${s.fullLevel} quả từ lần nhập gần nhất`}
      </p>
      {error && <Alert>{error}</Alert>}

      {mode === 'view' && (
        <div className="shuttle-card__actions">
          <button type="button" className="btn btn--primary" onClick={() => setMode('restock')}>
            <Icon name="plus" size={18} />
            Nhập thêm
          </button>
          <button type="button" className="btn btn--outline" onClick={() => setMode('edit')}>
            <Icon name="edit" size={18} />
            Kiểm kê
          </button>
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={remove}>
            <Icon name="trash" size={18} />
            Xóa
          </button>
        </div>
      )}

      {mode === 'restock' && (
        <StockForm
          idPrefix={`restock-${s.id}`}
          submitLabel="Nhập thêm"
          onCancel={() => setMode('view')}
          onSubmit={async (v) => {
            onChanged(await shuttlesApi.restock(s.id, { quantity: v.quantity, totalPrice: v.totalPrice }));
            setMode('view');
          }}
        />
      )}

      {mode === 'edit' && (
        <form className="stock-form stack stack--tight" onSubmit={saveEdit}>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor={`name-${s.id}`}>
                Tên loại cầu
              </label>
              <input
                id={`name-${s.id}`}
                className="input"
                maxLength={40}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor={`count-${s.id}`}>
                Số quả đếm được
              </label>
              <input
                id={`count-${s.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                required
                className="input"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
          </div>
          <p className="hint">
            Dùng khi số cầu thực tế khác trong app (quên cập nhật, cho bạn mượn…). Giá mỗi quả giữ nguyên.
          </p>
          <div className="form-footer">
            <button type="button" className="btn btn--outline" onClick={() => setMode('view')} disabled={busy}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

const weekLabel = (start: string) => `${start.slice(8, 10)}/${start.slice(5, 7)}`;
const monthLabel = (ym: string) => `Th${Number(ym.slice(5, 7))}`;

/** Biểu đồ cột số quả đã dùng (một chuỗi số liệu: không cần chú thích) */
function UsageChart({ stats, period }: { stats: ShuttleStats; period: 'week' | 'month' }) {
  const rows =
    period === 'week'
      ? stats.weeks.map((w) => ({
          key: w.start,
          label: weekLabel(w.start),
          full: `Tuần từ ${weekLabel(w.start)}`,
          value: w.quantity,
        }))
      : stats.months.map((m) => ({
          key: m.month,
          label: monthLabel(m.month),
          full: `Tháng ${Number(m.month.slice(5, 7))}/${m.month.slice(0, 4)}`,
          value: m.quantity,
        }));
  const max = Math.max(...rows.map((r) => r.value));
  const top = max > 0 ? max : 1;
  const maxIndex = rows.findIndex((r) => r.value === max);

  return (
    <figure className="usage-chart">
      {max === 0 && (
        <p className="usage-chart__empty">Chưa có số liệu. Nhập khoản Cầu theo số quả trong kèo của bạn.</p>
      )}
      <div className="usage-chart__plot" aria-hidden="true">
        {rows.map((r, i) => {
          const current = i === rows.length - 1;
          const showValue = r.value > 0 && (current || i === maxIndex);
          return (
            <div key={r.key} className="usage-chart__col">
              <span className="usage-chart__tip">
                {r.full}: <strong>{r.value} quả</strong>
              </span>
              <div className="usage-chart__bar-area">
                {showValue && <span className="usage-chart__value">{r.value}</span>}
                <span
                  className={`usage-chart__bar${current ? ' usage-chart__bar--current' : ''}`}
                  style={{ height: `${(r.value / top) * 100}%` }}
                />
              </div>
              <span className={`usage-chart__label${current ? ' usage-chart__label--current' : ''}`}>{r.label}</span>
            </div>
          );
        })}
      </div>
      {/* Bảng cho trình đọc màn hình */}
      <table className="sr-only">
        <caption>Số quả cầu đã dùng theo {period === 'week' ? 'tuần' : 'tháng'}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.full}</th>
              <td>{r.value} quả</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Kho cầu (WBS 4.10): các loại cầu đang có, nhập thêm, kiểm kê, thống kê số quả đã dùng */
export default function ShuttleStockPage() {
  const [items, setItems] = useState<Shuttle[] | null>(null);
  const [stats, setStats] = useState<ShuttleStats | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shuttlesApi
      .list()
      .then(setItems)
      .catch((e) => setError(toApiError(e).message));
    shuttlesApi
      .stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const total = items?.reduce((s, x) => s + x.quantity, 0) ?? 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ to: '/tai-khoan', label: 'Tài khoản' }]}
        title="Kho cầu"
        subtitle="Cầu bạn đang có. Tự trừ khi bạn nhập khoản Cầu trong kèo của mình."
      />
      <div className="stack">
        {error && <Alert>{error}</Alert>}

        <section className="card stack" aria-label="Đã dùng">
          <div className="action-card__status">
            <CardTitle icon="level" className="mt-0">
              Đã dùng
            </CardTitle>
            <div className="seg" role="group" aria-label="Xem theo">
              {(['week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`seg__btn${period === p ? ' seg__btn--on' : ''}`}
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
          </div>
          {!stats ? (
            <Spinner />
          ) : (
            <>
              <div className="usage-tiles">
                <div className="usage-tile">
                  <p className="usage-tile__value">{stats.thisWeek}</p>
                  <p className="usage-tile__label">quả tuần này</p>
                </div>
                <div className="usage-tile">
                  <p className="usage-tile__value">{stats.thisMonth}</p>
                  <p className="usage-tile__label">quả tháng này</p>
                </div>
                <div className="usage-tile">
                  <p className="usage-tile__value">{items ? total : '–'}</p>
                  <p className="usage-tile__label">quả còn trong kho</p>
                </div>
              </div>
              <UsageChart stats={stats} period={period} />
              <p className="hint">Tính từ khoản Cầu (theo số quả) trong các kèo bạn làm chủ, đã diễn ra và chưa hủy.</p>
            </>
          )}
        </section>

        <div className="results-header">
          <h2 className="section-title mt-0">Các loại cầu{items ? ` (${items.length})` : ''}</h2>
          {!adding && (
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} />
              Thêm loại cầu
            </button>
          )}
        </div>

        {adding && (
          <section className="card stack" aria-label="Thêm loại cầu">
            <CardTitle icon="shuttle" className="mt-0">
              Thêm loại cầu
            </CardTitle>
            <StockForm
              idPrefix="new"
              withName
              submitLabel="Thêm vào kho"
              onCancel={() => setAdding(false)}
              onSubmit={async (v) => {
                const created = await shuttlesApi.create(v);
                setItems((xs) => [...(xs ?? []), created]);
                setAdding(false);
              }}
            />
          </section>
        )}

        {!items && !error && <Spinner />}
        {items && items.length === 0 && !adding && (
          <div className="card empty">
            <Icon name="shuttle" size={40} className="empty__icon" />
            <p>Kho chưa có cầu. Thêm loại cầu bạn đang dùng để tự tính tiền cầu theo số quả trong kèo.</p>
          </div>
        )}
        {items && items.length > 0 && (
          <ul className="shuttle-list">
            {items.map((s) => (
              <ShuttleCard
                key={`${s.id}-${s.updatedAt}`}
                s={s}
                onChanged={(n) => setItems((xs) => xs!.map((x) => (x.id === n.id ? n : x)))}
                onRemoved={() => setItems((xs) => xs!.filter((x) => x.id !== s.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
