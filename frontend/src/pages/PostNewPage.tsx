import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toApiError } from '../api/client';
import { parserApi } from '../api/parser';
import { postsApi } from '../api/posts';
import PageHeader from '../components/PageHeader';
import { Alert, FieldError } from '../components/ui';
import { HANOI_AREAS, LEVEL_LABELS, SKILL_LEVELS, type SkillLevel } from '../utils/constants';
import { emptyPostForm, formToInput, parsedToForm, type PostFormValues } from '../utils/postForm';

const EXAMPLE = 'Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng';

const SLOT_INPUTS = [
  ['slotsMale', 'Nam'],
  ['slotsFemale', 'Nữ'],
  ['slotsAny', 'Nam hoặc nữ'],
] as const;

export default function PostNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PostFormValues>(() => emptyPostForm(new Date()));
  const [autofilled, setAutofilled] = useState<Set<keyof PostFormValues>>(new Set());

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseInfo, setParseInfo] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Người dùng tự sửa → bỏ đánh dấu "tự điền"
    setAutofilled((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  /** Ô được bộ trích xuất điền sẵn sẽ có nền vàng nhạt */
  const cls = (key: keyof PostFormValues) => `input${autofilled.has(key) ? ' input--autofilled' : ''}`;

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    setParseInfo(null);
    try {
      const result = await parserApi.parse(rawText);
      const patch = parsedToForm(result, new Date());
      setForm((f) => ({ ...f, ...patch }));
      setAutofilled(new Set(Object.keys(patch) as (keyof PostFormValues)[]));
      const found = Math.round(result.confidence * 4);
      setParseInfo(
        found === 0
          ? 'Không nhận ra thông tin nào. Bạn điền tay giúp nhé.'
          : `Đã nhận ra ${found}/4 nhóm thông tin (thời gian, giá, số chỗ, trình độ). Kiểm tra các ô màu vàng trước khi đăng.`,
      );
    } catch (err) {
      setParseInfo(toApiError(err).message);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const post = await postsApi.create(formToInput(form, rawText));
      navigate(`/keo/${post.id}`);
    } catch (err) {
      const info = toApiError(err);
      setError(info.message);
      setFields(info.fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Đăng kèo mới" subtitle="Dán bài đăng sẵn có để điền nhanh, hoặc điền tay bên dưới" />

      <div className="page-body stack">
        {/* ---- Dán bài → tự điền ---- */}
        <section className="card paste-box stack">
          <div className="field">
            <label htmlFor="rawText" className="label">
              Dán bài đăng của bạn để tự điền form
            </label>
            <textarea
              id="rawText"
              rows={3}
              className="input"
              placeholder={`Ví dụ: ${EXAMPLE}`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleParse}
              disabled={parsing || !rawText.trim()}
            >
              {parsing ? 'Đang đọc…' : 'Tự điền'}
            </button>
            {!rawText && (
              <button type="button" className="btn btn--link" onClick={() => setRawText(EXAMPLE)}>
                Dùng bài mẫu
              </button>
            )}
          </div>
          {parseInfo && <Alert tone="info">{parseInfo}</Alert>}
        </section>

        {/* ---- Form ---- */}
        <form onSubmit={handleSubmit} className="card stack">
          {error && <Alert>{error}</Alert>}

          <div className="grid-2">
            <div className="field">
              <label htmlFor="courtName" className="label">
                Tên sân *
              </label>
              <input
                id="courtName"
                required
                className={cls('courtName')}
                value={form.courtName}
                onChange={(e) => set('courtName', e.target.value)}
              />
              <FieldError message={fields.courtName} />
            </div>
            <div className="field">
              <label htmlFor="district" className="label">
                Khu vực *
              </label>
              <select
                id="district"
                required
                className={cls('district')}
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
              >
                <option value="">Chọn khu vực</option>
                {HANOI_AREAS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <FieldError message={fields.district} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="address" className="label">
              Địa chỉ sân
            </label>
            <input
              id="address"
              className={cls('address')}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
            <FieldError message={fields.address} />
          </div>

          <div className="grid-3">
            <div className="field">
              <label htmlFor="date" className="label">
                Ngày *
              </label>
              <input
                id="date"
                type="date"
                required
                className={cls('date')}
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="startTime" className="label">
                Bắt đầu *
              </label>
              <input
                id="startTime"
                type="time"
                required
                className={cls('startTime')}
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
              />
              <FieldError message={fields.startsAt} />
            </div>
            <div className="field">
              <label htmlFor="endTime" className="label">
                Kết thúc *
              </label>
              <input
                id="endTime"
                type="time"
                required
                className={cls('endTime')}
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
              />
              <FieldError message={fields.endsAt} />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="levelMin" className="label">
                Trình độ từ
              </label>
              <select
                id="levelMin"
                className={cls('levelMin')}
                value={form.levelMin}
                onChange={(e) => set('levelMin', e.target.value as SkillLevel)}
              >
                {SKILL_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
              <FieldError message={fields.levelMin} />
            </div>
            <div className="field">
              <label htmlFor="levelMax" className="label">
                đến
              </label>
              <select
                id="levelMax"
                className={cls('levelMax')}
                value={form.levelMax}
                onChange={(e) => set('levelMax', e.target.value as SkillLevel)}
              >
                {SKILL_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="price" className="label">
              Chi phí mỗi người (đồng)
            </label>
            <input
              id="price"
              type="number"
              min={0}
              step={1000}
              className={cls('pricePerPerson')}
              value={form.pricePerPerson}
              onChange={(e) => set('pricePerPerson', e.target.value)}
            />
            <FieldError message={fields.pricePerPerson} />
          </div>

          <fieldset className="field">
            <legend className="label">Cần thêm bao nhiêu người?</legend>
            <div className="grid-3 grid-3--even">
              {SLOT_INPUTS.map(([key, label]) => (
                <div key={key} className="field">
                  <label htmlFor={key} className="hint">
                    {label}
                  </label>
                  <input
                    id={key}
                    type="number"
                    min={0}
                    max={20}
                    className={cls(key)}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <FieldError message={fields.slots} />
          </fieldset>

          <div className="field">
            <label htmlFor="note" className="label">
              Ghi chú
            </label>
            <textarea
              id="note"
              rows={2}
              className={cls('note')}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Đang đăng…' : 'Đăng kèo'}
          </button>
        </form>
      </div>
    </>
  );
}
