import { useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import type { PostDetail, Settlement } from '../types';
import { formatPrice } from '../utils/format';
import { minHeadcount, perPersonOf } from '../utils/settlement';
import { Alert, FieldError } from './ui';

const FEES = [
  ['courtFee', 'Tiền sân'],
  ['shuttleFee', 'Tiền cầu'],
  ['otherFee', 'Nước và khác'],
] as const;

type FeeKey = (typeof FEES)[number][0];

const toInt = (value: string) => (value.trim() === '' ? 0 : Number(value));

/** Chi phí đã chốt, dạng chỉ đọc (người tham gia, hoặc chủ kèo khi đã hết khung giờ chốt) */
export function SettlementSummary({ settlement }: { settlement: Settlement }) {
  return (
    <dl className="pay-list">
      {FEES.filter(([key]) => settlement[key] > 0).map(([key, label]) => (
        <div key={key} className="pay-row">
          <dt>{label}</dt>
          <dd>{formatPrice(settlement[key])}</dd>
        </div>
      ))}
      <div className="pay-row">
        <dt>Tổng, chia {settlement.headcount} người</dt>
        <dd>
          {formatPrice(settlement.total)} → {formatPrice(settlement.perPerson)}/người
        </dd>
      </div>
    </dl>
  );
}

/** Chủ kèo chốt chi phí thật sau buổi + điểm danh (WBS 4.8.2) */
export default function SettlementForm({ post, onSaved }: { post: PostDetail; onSaved: (post: PostDetail) => void }) {
  const saved = post.settlement ?? null;
  const [fees, setFees] = useState<Record<FeeKey, string>>({
    courtFee: saved ? String(saved.courtFee) : '',
    shuttleFee: saved ? String(saved.shuttleFee) : '',
    otherFee: saved ? String(saved.otherFee) : '',
  });
  // Mặc định mọi người có mặt
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(post.participants.map((p) => [p.id, p.attended ?? true])),
  );
  const [chargeAbsent, setChargeAbsent] = useState(saved?.chargeAbsent ?? false);
  // Chưa sửa tay thì số người chơi tự theo điểm danh (người phải trả + chủ kèo)
  const [headcount, setHeadcount] = useState<string>(saved ? String(saved.headcount) : '');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const attendedList = post.participants.map((p) => attendance[p.id]);
  const minimum = minHeadcount(attendedList, chargeAbsent);
  const people = headcount.trim() === '' ? minimum : toInt(headcount);
  const total = FEES.reduce((sum, [key]) => sum + (toInt(fees[key]) || 0), 0);
  const perPerson = perPersonOf(total, people);
  const absent = attendedList.filter((a) => !a).length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const updated = await postsApi.settle(post.id, {
        courtFee: toInt(fees.courtFee),
        shuttleFee: toInt(fees.shuttleFee),
        otherFee: toInt(fees.otherFee),
        headcount: people,
        chargeAbsent,
        attendance: post.participants.map((p) => ({ userId: p.id, attended: attendance[p.id] })),
      });
      onSaved(updated);
      setHeadcount(String(updated.settlement?.headcount ?? people));
    } catch (err) {
      const info = toApiError(err);
      setError(info.message);
      setFields(info.fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card stack" aria-label="Chốt chi phí">
      <div>
        <h2 className="card__title">{saved ? 'Chi phí đã chốt' : 'Chốt chi phí sau buổi'}</h2>
        <p className="hint">
          Nhập chi phí thật và đánh dấu ai có mặt. Mã QR của người chơi sẽ cập nhật theo số tiền mới. Sửa được tới 24
          giờ sau giờ kết thúc.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}

      <fieldset className="stack">
        <legend className="label">Điểm danh</legend>
        {post.participants.map((p) => (
          <label key={p.id} className="checkbox">
            <input
              type="checkbox"
              checked={attendance[p.id]}
              onChange={(e) => setAttendance((a) => ({ ...a, [p.id]: e.target.checked }))}
            />
            <span>
              {p.displayName} {attendance[p.id] ? '' : <span className="hint">(vắng)</span>}
            </span>
          </label>
        ))}
        <FieldError message={fields.attendance} />
      </fieldset>

      <div className="grid-3 grid-3--even">
        {FEES.map(([key, label]) => (
          <div key={key} className="field">
            <label htmlFor={`fee-${key}`} className="label">
              {label} (đồng)
            </label>
            <input
              id={`fee-${key}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              className="input"
              value={fees[key]}
              onChange={(e) => setFees((f) => ({ ...f, [key]: e.target.value }))}
            />
            <FieldError message={fields[key]} />
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="headcount" className="label">
            Tổng số người chơi trong buổi
          </label>
          <input
            id="headcount"
            type="number"
            inputMode="numeric"
            min={minimum}
            max={50}
            className="input"
            placeholder={String(minimum)}
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
          />
          <p className="hint">Gồm bạn và bạn bè không dùng app. Tối thiểu {minimum}.</p>
          <FieldError message={fields.headcount} />
        </div>
        <label className="checkbox settle-absent">
          <input
            type="checkbox"
            checked={chargeAbsent}
            disabled={absent === 0}
            onChange={(e) => setChargeAbsent(e.target.checked)}
          />
          <span>Người vắng vẫn phải trả phần của mình (sân đã đặt)</span>
        </label>
      </div>

      <p className="settle-preview">
        Tổng <strong>{formatPrice(total)}</strong> ÷ {people} người = <strong>{formatPrice(perPerson)}/người</strong>
        {perPerson !== post.pricePerPerson && (
          <span className="hint"> (dự kiến {formatPrice(post.pricePerPerson)})</span>
        )}
      </p>

      <div className="form-footer">
        <button type="submit" className="btn btn--primary" disabled={busy || total === 0}>
          {busy ? 'Đang lưu…' : saved ? 'Cập nhật chi phí' : 'Chốt chi phí'}
        </button>
      </div>
    </form>
  );
}
