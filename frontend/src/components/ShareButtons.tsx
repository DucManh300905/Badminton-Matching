import { useState } from 'react';
import type { PostDetail } from '../types';
import { moneyText, recruitText, shareText } from '../utils/share';
import Icon from './Icon';

/** "Chia sẻ kèo" (ai cũng có) và "Gửi tin thu tiền" (người trong kèo, khi đã có chi phí) — WBS 4.8.4 */
export default function ShareButtons({ post }: { post: PostDetail }) {
  const [done, setDone] = useState<string | null>(null);
  const origin = window.location.origin;
  const money = moneyText(post, origin);

  async function share(kind: 'recruit' | 'money') {
    const text = kind === 'recruit' ? recruitText(post, origin) : money!;
    const res = await shareText(post.courtName, text);
    if (res === 'copied') {
      setDone(kind === 'recruit' ? 'Đã chép tin tuyển người, dán vào Zalo / Messenger.' : 'Đã chép tin thu tiền.');
      setTimeout(() => setDone(null), 3000);
    }
  }

  return (
    <div className="share-buttons">
      <button type="button" className="btn btn--outline btn--block" onClick={() => share('recruit')}>
        <Icon name="share" size={18} />
        Chia sẻ kèo
      </button>
      {money && (
        <button type="button" className="btn btn--outline btn--block" onClick={() => share('money')}>
          <Icon name="wallet" size={18} />
          Gửi tin thu tiền
        </button>
      )}
      {done && (
        <p className="hint" role="status">
          {done}
        </p>
      )}
    </div>
  );
}
