import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { PostPayment, Settlement } from '../types';
import { formatPrice } from '../utils/format';
import { SettlementSummary } from './SettlementForm';
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

/** Thẻ "Thanh toán" cho người đã tham gia kèo: mã QR VietQR đúng số tiền + nội dung chuyển khoản */
export default function PaymentCard({
  payment,
  postId,
  settlement = null,
}: {
  payment: PostPayment;
  postId: string;
  /** Chi phí đã chốt sau buổi (WBS 4.8.2); null = chưa chốt, trả theo giá đăng kèo */
  settlement?: Settlement | null;
}) {
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

  const absent = payment.attended === false;

  if (payment.amount === 0) {
    return (
      <section className="card stack" aria-label="Thanh toán">
        <h2 className="card__title">Thanh toán</h2>
        <p className="hint">
          {absent
            ? 'Chủ kèo ghi nhận bạn vắng mặt buổi này, bạn không phải trả tiền. Nếu ghi nhận sai, hãy báo chủ kèo.'
            : 'Kèo miễn phí, không cần chuyển tiền.'}
        </p>
      </section>
    );
  }

  return (
    <section className="card pay-card" aria-label="Thanh toán">
      <div className="action-card__status">
        <h2 className="card__title mt-0">Thanh toán</h2>
        <span className={`badge badge--${payment.paid ? 'open' : 'full'}`}>
          {payment.paid ? 'Đã trả' : 'Chưa xác nhận'}
        </span>
      </div>
      {absent && (
        <Alert tone="info">Chủ kèo ghi nhận bạn vắng mặt, nhưng người vắng vẫn trả phần của mình vì sân đã đặt.</Alert>
      )}
      {settlement && (
        <>
          <p className="hint">Chủ kèo đã chốt chi phí thật sau buổi chơi:</p>
          <SettlementSummary settlement={settlement} />
        </>
      )}

      {!payment.available ? (
        <p className="hint">
          Chủ kèo chưa thêm tài khoản nhận tiền. Bạn trả {formatPrice(payment.amount)} trực tiếp cho chủ kèo nhé.
        </p>
      ) : (
        <>
          <div className="pay-card__qr">
            {qrUrl ? (
              <img src={qrUrl} alt={`Mã QR chuyển ${formatPrice(payment.amount)} cho ${payment.accountName}`} />
            ) : (
              <div className="pay-card__qr-loading">Đang tạo mã QR…</div>
            )}
          </div>
          <p className="pay-card__amount">{formatPrice(payment.amount)}</p>
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
            Đang dùng chính điện thoại này? Lưu ảnh QR rồi mở từ ứng dụng ngân hàng (mục quét mã, chọn ảnh). Chủ kèo sẽ
            đánh dấu "Đã trả" sau khi nhận được tiền.
          </p>
        </>
      )}
    </section>
  );
}
