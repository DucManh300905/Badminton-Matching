import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { PostPayment } from '../types';
import { formatMoney } from '../utils/format';
import { Alert } from './ui';

/** Sao chép, có phương án dự phòng cho trình duyệt không cho dùng Clipboard API (http, webview cũ) */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="pay-row">
      <dt>{label}</dt>
      <dd>
        <span className="pay-row__value">{value}</span>
        <button
          type="button"
          className="btn btn--link pay-row__copy"
          onClick={async () => {
            setCopied(await copyText(value));
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      </dd>
    </div>
  );
}

const STATUS_BADGE: Record<string, { text: string; tone: string }> = {
  unpaid: { text: 'Chưa trả', tone: 'full' },
  paid: { text: 'Đã trả', tone: 'open' },
  owe: { text: 'Còn thiếu', tone: 'closed' },
  overpaid: { text: 'Trả dư', tone: 'open' },
};

/**
 * Thẻ "Thanh toán" cho người đã tham gia kèo: số tiền của riêng mình theo các khoản chi,
 * mã QR VietQR đúng số còn phải chuyển (còn thiếu nếu chi phí tăng sau khi đã trả).
 */
export default function PaymentCard({ payment, postId }: { payment: PostPayment; postId: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (payment.qr) {
      QRCode.toDataURL(payment.qr, { width: 440, margin: 1, errorCorrectionLevel: 'M' })
        .then((url) => !cancelled && setQrUrl(url))
        .catch(() => !cancelled && setQrUrl(null));
    }
    return () => {
      cancelled = true;
    };
  }, [payment.qr]);

  const amount = payment.amount ?? 0;
  const toPay = payment.toPay ?? 0;
  const diff = payment.diff ?? 0;
  const badge = payment.status ? STATUS_BADGE[payment.status] : undefined;
  const absentNote = payment.attended === false && (
    <p className="hint">Chủ kèo ghi nhận bạn vắng mặt buổi này. Nếu ghi nhận sai, hãy báo chủ kèo.</p>
  );

  // Chủ kèo chưa nhập khoản chi nào → chưa có mã QR
  if (!payment.hasCosts) {
    return (
      <section className="card stack" aria-label="Thanh toán">
        <h2 className="card__title mt-0">Thanh toán</h2>
        <p className="hint">
          Chủ kèo chưa nhập chi phí.
          {payment.estimate > 0 && ` Chi phí dự kiến khoảng ${formatMoney(payment.estimate)}/người.`} Mã QR sẽ hiện khi
          chủ kèo nhập các khoản chi.
        </p>
      </section>
    );
  }

  if (amount === 0 && payment.status !== 'overpaid') {
    return (
      <section className="card stack" aria-label="Thanh toán">
        <h2 className="card__title mt-0">Thanh toán</h2>
        <p className="hint">Bạn không phải trả khoản nào trong kèo này.</p>
        {absentNote}
      </section>
    );
  }

  return (
    <section className="card pay-card" aria-label="Thanh toán">
      <div className="action-card__status">
        <h2 className="card__title mt-0">Thanh toán</h2>
        {badge && <span className={`badge badge--${badge.tone}`}>{badge.text}</span>}
      </div>
      <p className="pay-card__line">
        Phần của bạn: <strong>{formatMoney(amount)}</strong>
        {payment.paidAmount != null && <span className="hint"> · đã trả {formatMoney(payment.paidAmount)}</span>}
      </p>
      {absentNote}

      {payment.status === 'overpaid' && (
        <Alert tone="info">Bạn đã trả dư {formatMoney(diff)} do chi phí giảm. Chủ kèo sẽ hoàn lại cho bạn.</Alert>
      )}
      {payment.status === 'paid' && <p className="hint">Bạn đã trả đủ. Cảm ơn bạn!</p>}
      {payment.status === 'owe' && (
        <Alert tone="info">Chi phí tăng sau khi bạn đã trả. Bạn cần chuyển thêm {formatMoney(diff)}.</Alert>
      )}

      {toPay > 0 &&
        (!payment.available ? (
          <p className="hint">
            Chủ kèo chưa thêm tài khoản nhận tiền. Bạn trả {formatMoney(toPay)} trực tiếp cho chủ kèo nhé.
          </p>
        ) : (
          <>
            <div className="pay-card__qr">
              {qrUrl ? (
                <img src={qrUrl} alt={`Mã QR chuyển ${formatMoney(toPay)} cho ${payment.accountName}`} />
              ) : (
                <div className="pay-card__qr-loading">Đang tạo mã QR…</div>
              )}
            </div>
            <p className="pay-card__amount">{formatMoney(toPay)}</p>
            <p className="hint text-center">Quét bằng ứng dụng ngân hàng, mọi thông tin đã được điền sẵn.</p>

            <dl className="pay-list">
              <div className="pay-row">
                <dt>Ngân hàng</dt>
                <dd>{payment.bank?.shortName}</dd>
              </div>
              <div className="pay-row">
                <dt>Chủ tài khoản</dt>
                <dd>{payment.accountName}</dd>
              </div>
              {payment.accountNumber && <CopyRow label="Số tài khoản" value={payment.accountNumber} />}
              {payment.content && <CopyRow label="Nội dung" value={payment.content} />}
            </dl>

            {qrUrl && (
              <a className="btn btn--outline btn--block" href={qrUrl} download={`ma-qr-keo-${postId.slice(-6)}.png`}>
                Lưu ảnh QR
              </a>
            )}
            <p className="hint">
              Đang dùng chính điện thoại này? Lưu ảnh QR rồi mở từ ứng dụng ngân hàng (mục quét mã, chọn ảnh). Chủ kèo
              sẽ đánh dấu "Đã trả" sau khi nhận được tiền.
            </p>
          </>
        ))}
    </section>
  );
}
