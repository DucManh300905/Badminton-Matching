const nodemailer = require('nodemailer');

// ── Gửi email (WBS 4.14): quên mật khẩu, báo chủ kèo có ảnh chuyển khoản ──
// - Máy chủ: Gmail SMTP với "mật khẩu ứng dụng" (SMTP_USER, SMTP_PASS trong .env; xem docs/DEPLOY.md).
// - Chưa cấu hình SMTP: không gửi, ghi tiêu đề + người nhận ra log (chạy trên máy: in cả nội dung để thử link).
// - Test (NODE_ENV=test): giữ thư trong bộ nhớ (`outbox`) để kiểm tra nội dung.

/** "manh.an@gmail.com" → "m***@gmail.com": log không chứa đầy đủ email */
const maskEmail = (email) => String(email).replace(/^(.)[^@]*(@.*)$/, '$1***$2');

/** Thư đã "gửi" khi chạy test */
const outbox = [];

let transport = null;

const configured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransport = () => {
    if (!transport) {
        transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: (Number(process.env.SMTP_PORT) || 465) === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
    }
    return transport;
};

/** Địa chỉ web để đặt link trong thư (cùng CLIENT_URL) */
const appUrl = () => (process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Thư đơn giản: tiêu đề, các đoạn văn, một nút (link). Có bản chữ thường cho ứng dụng thư không hiện HTML.
 * `code`: mã OTP hiện to, dễ đọc (thư quên mật khẩu).
 * @param {{ to: string, subject: string, paragraphs: string[], button?: { label: string, url: string }, code?: string }} mail
 */
const render = ({ subject, paragraphs, button, code }) => {
    const text = [...paragraphs, button ? `${button.label}: ${button.url}` : '', '', 'Badminton Matching']
        .filter((l, i, a) => l || a[i - 1])
        .join('\n');
    const html = `<!doctype html><html lang="vi"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#1b2a22">
<div style="max-width:520px;margin:0 auto;padding:24px">
<p style="font-weight:700;color:#0a7a3c;margin:0 0 12px">Badminton Matching</p>
<div style="background:#fff;border-radius:12px;padding:20px">
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 10px;line-height:1.5">${escapeHtml(p)}</p>`).join('\n')}
${
    code
        ? `<p style="margin:16px 0;text-align:center"><span style="display:inline-block;padding:12px 22px;border-radius:10px;background:#ecf8f1;color:#0a7a3c;font-size:30px;font-weight:700;letter-spacing:10px">${escapeHtml(code)}</span></p>`
        : ''
}
${
    button
        ? `<p style="margin:18px 0 6px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#11924c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700">${escapeHtml(button.label)}</a></p>
<p style="font-size:12px;color:#6c7d74;word-break:break-all">${escapeHtml(button.url)}</p>`
        : ''
}
</div>
<p style="font-size:12px;color:#6c7d74">Thư tự động, vui lòng không trả lời.</p>
</div></body></html>`;
    return { text, html };
};

/**
 * Gửi thư. Không ném lỗi ra ngoài: gửi thư hỏng không được làm hỏng thao tác chính của người dùng.
 * @returns {Promise<boolean>} đã gửi (hoặc đã đưa vào outbox khi test)
 */
const sendMail = async (mail) => {
    const { text, html } = render(mail);
    if (process.env.NODE_ENV === 'test') {
        outbox.push({ to: mail.to, subject: mail.subject, text, html });
        return true;
    }
    if (!configured()) {
        console.log(`[mail] chưa cấu hình SMTP, bỏ qua thư "${mail.subject.replace(/\d{4}$/, '****')}" tới ${maskEmail(mail.to)}`);
        // Chạy trên máy: in nội dung để thử được link (không bao giờ in ở máy chủ chạy thật)
        if (process.env.NODE_ENV !== 'production') console.log(text);
        return false;
    }
    try {
        await getTransport().sendMail({
            from: process.env.MAIL_FROM || `Badminton Matching <${process.env.SMTP_USER}>`,
            to: mail.to,
            subject: mail.subject,
            text,
            html
        });
        console.log(`[mail] đã gửi "${mail.subject.replace(/\d{4}$/, '****')}" tới ${maskEmail(mail.to)}`);
        return true;
    } catch (err) {
        console.error(`[mail] gửi thất bại "${mail.subject.replace(/\d{4}$/, '****')}" tới ${maskEmail(mail.to)}:`, err.message);
        return false;
    }
};

module.exports = { sendMail, appUrl, outbox, escapeHtml, maskEmail };
