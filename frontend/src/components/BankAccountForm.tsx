import { useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { BANKS } from '../utils/banks';
import { Alert, FieldError } from './ui';

/** Hồ sơ cá nhân → "Nhận tiền chuyển khoản": tài khoản để người tham gia kèo chuyển tiền bằng mã QR */
export default function BankAccountForm() {
  const { user, setUser } = useAuth();
  const saved = user?.bankAccount;
  const [form, setForm] = useState({
    bankBin: saved?.bankBin ?? '',
    accountNumber: saved?.accountNumber ?? '',
    accountName: saved?.accountName ?? '',
  });
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    setFields({});
    try {
      await action();
    } catch (err) {
      const info = toApiError(err);
      setMessage({ tone: 'error', text: info.message });
      setFields(info.fields);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const updated = await usersApi.setBankAccount(form);
      setUser(updated);
      // Hiện lại đúng dạng server đã chuẩn hóa (bỏ khoảng trắng, in hoa không dấu)
      if (updated.bankAccount) setForm(updated.bankAccount);
      setMessage({ tone: 'success', text: 'Đã lưu tài khoản nhận tiền.' });
    });
  }

  function handleDelete() {
    if (!window.confirm('Xóa tài khoản nhận tiền? Người tham gia kèo sẽ không thấy mã QR nữa.')) return;
    void run(async () => {
      setUser(await usersApi.deleteBankAccount());
      setForm({ bankBin: '', accountNumber: '', accountName: '' });
      setMessage({ tone: 'success', text: 'Đã xóa tài khoản nhận tiền.' });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card form-card stack" aria-label="Nhận tiền chuyển khoản">
      <div>
        <h2 className="card__title">Nhận tiền chuyển khoản</h2>
        <p className="hint">
          Người tham gia kèo của bạn sẽ thấy mã QR chuyển đúng số tiền vào tài khoản này. Chỉ người đã tham gia kèo của
          bạn mới thấy số tài khoản. Hệ thống không giữ tiền.
        </p>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="field">
        <label htmlFor="bankBin" className="label">
          Ngân hàng
        </label>
        <select
          id="bankBin"
          required
          className="input"
          value={form.bankBin}
          onChange={(e) => set('bankBin', e.target.value)}
        >
          <option value="">Chọn ngân hàng</option>
          {BANKS.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.shortName}
            </option>
          ))}
        </select>
        <FieldError message={fields.bankBin} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="accountNumber" className="label">
            Số tài khoản
          </label>
          <input
            id="accountNumber"
            required
            inputMode="numeric"
            autoComplete="off"
            className="input"
            value={form.accountNumber}
            onChange={(e) => set('accountNumber', e.target.value)}
          />
          <FieldError message={fields.accountNumber} />
        </div>
        <div className="field">
          <label htmlFor="accountName" className="label">
            Tên chủ tài khoản
          </label>
          <input
            id="accountName"
            required
            autoComplete="off"
            className="input"
            placeholder="NGUYEN VAN A"
            value={form.accountName}
            onChange={(e) => set('accountName', e.target.value)}
          />
          <FieldError message={fields.accountName} />
        </div>
      </div>
      <p className="hint">Tên được tự đổi sang chữ in hoa không dấu, giống tên hiện trong ứng dụng ngân hàng.</p>
      <div className="form-footer">
        {saved && (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={handleDelete}>
            Xóa
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu tài khoản'}
        </button>
      </div>
    </form>
  );
}
