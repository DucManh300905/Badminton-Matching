import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import PageHeader from '../components/PageHeader';
import { Alert, FieldError } from '../components/ui';
import { HANOI_AREAS, LEVEL_LABELS, SKILL_LEVELS, type SkillLevel } from '../utils/constants';
import { emptyPostForm, formToInput, type PostFormValues } from '../utils/postForm';

const SLOT_INPUTS = [
  ['slotsMale', 'Nam'],
  ['slotsFemale', 'Nữ'],
  ['slotsAny', 'Nam hoặc nữ'],
] as const;

export default function PostNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PostFormValues>(() => emptyPostForm(new Date()));

  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const post = await postsApi.create(formToInput(form));
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
      <PageHeader
        breadcrumbs={[{ to: '/', label: 'Danh sách kèo' }]}
        title="Đăng kèo mới"
        subtitle="Điền thông tin kèo. Chi phí thật (sân, cầu, nước, ăn…) bạn nhập sau trong trang kèo."
      />

      <form onSubmit={handleSubmit} className="card form-narrow">
        {error && (
          <div className="notice">
            <Alert>{error}</Alert>
          </div>
        )}

        <section className="form-section">
          <h2 className="form-section__title">Sân và thời gian</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="courtName" className="label">
                Tên sân *
              </label>
              <input
                id="courtName"
                required
                className="input"
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
                className="input"
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
              className="input"
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
                className="input"
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
                className="input"
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
                className="input"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
              />
              <FieldError message={fields.endsAt} />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section__title">Trình độ và chi phí</h2>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="levelMin" className="label">
                Trình độ từ
              </label>
              <select
                id="levelMin"
                className="input"
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
                Đến
              </label>
              <select
                id="levelMax"
                className="input"
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
            <div className="field">
              <label htmlFor="price" className="label">
                Chi phí dự kiến mỗi người (đồng)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                step={1000}
                className="input"
                value={form.pricePerPerson}
                onChange={(e) => set('pricePerPerson', e.target.value)}
              />
              <FieldError message={fields.pricePerPerson} />
            </div>
          </div>
        </section>

        <section className="form-section">
          <fieldset>
            <legend className="form-section__title">Cần thêm bao nhiêu người?</legend>
            <div className="grid-3 grid-3--even">
              {SLOT_INPUTS.map(([key, label]) => (
                <div key={key} className="field">
                  <label htmlFor={key} className="label">
                    {label}
                  </label>
                  <input
                    id={key}
                    type="number"
                    min={0}
                    max={20}
                    className="input"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <FieldError message={fields.slots} />
          </fieldset>
        </section>

        <section className="form-section">
          <div className="field">
            <label htmlFor="note" className="label">
              Ghi chú
            </label>
            <textarea
              id="note"
              rows={3}
              className="input"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>
        </section>

        <div className="form-footer form-footer--sticky">
          <button type="button" className="btn btn--outline" onClick={() => navigate(-1)}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Đang đăng…' : 'Đăng kèo'}
          </button>
        </div>
      </form>
    </>
  );
}
