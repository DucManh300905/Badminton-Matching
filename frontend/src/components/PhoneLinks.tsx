import { formatPhone } from '../utils/format';
import Icon from './Icon';

/** Số điện thoại của người cùng kèo (WBS 4.15): bấm để gọi, kèm link mở Zalo */
export default function PhoneLinks({ phone, name }: { phone?: string | null; name: string }) {
  if (!phone) return null;
  return (
    <span className="phone-links">
      <a href={`tel:${phone}`} className="phone-links__call" aria-label={`Gọi ${name}: ${formatPhone(phone)}`}>
        <Icon name="phone" size={14} />
        {formatPhone(phone)}
      </a>
      <a
        href={`https://zalo.me/${phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="phone-links__zalo"
        aria-label={`Nhắn Zalo cho ${name}`}
      >
        Zalo
      </a>
    </span>
  );
}
