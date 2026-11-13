import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import client, { TOKEN_KEY, toApiError, tokenStore, UNAUTHORIZED_EVENT } from './client';

/** Tạo lỗi giống axios ném ra khi server trả status + body */
function apiError(status: number, data: unknown, withToken = false) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  if (withToken) config.headers.Authorization = 'Bearer abc';
  const response = { status, data, config, headers: {}, statusText: '' } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, response);
}

describe('toApiError', () => {
  it('dịch mã lỗi sang tiếng Việt', () => {
    const info = toApiError(apiError(409, { success: false, code: 'LEVEL_MISMATCH', message: 'x' }));
    expect(info).toEqual({
      code: 'LEVEL_MISMATCH',
      message: 'Trình độ của bạn không nằm trong khoảng kèo yêu cầu.',
      fields: {},
    });
  });

  it('gom lỗi theo trường; "slots.male" hiển thị chung ở ô "slots"', () => {
    const info = toApiError(
      apiError(400, {
        code: 'VALIDATION_ERROR',
        errors: [
          { field: 'courtName', msg: 'Tên sân không được để trống' },
          { field: 'slots.male', msg: 'Số chỗ phải là số nguyên' },
        ],
      }),
    );
    expect(info.fields).toEqual({ courtName: 'Tên sân không được để trống', slots: 'Số chỗ phải là số nguyên' });
  });

  it('trùng email → câu dễ hiểu ở cả thông báo chung và ô email', () => {
    const info = toApiError(
      apiError(409, { code: 'DUPLICATE', errors: [{ field: 'email', msg: 'email already exists' }] }),
    );
    expect(info.message).toBe('Email này đã được đăng ký.');
    expect(info.fields.email).toBe('Email này đã được đăng ký.');
  });

  it('không có phản hồi (server tắt, mất mạng) → NETWORK', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK', {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig);
    expect(toApiError(err).code).toBe('NETWORK');
  });

  it('mã lỗi lạ → dùng message của server', () => {
    expect(toApiError(apiError(418, { code: 'TEAPOT', message: 'Tôi là ấm trà' })).message).toBe('Tôi là ấm trà');
  });

  it('lỗi không phải của axios', () => {
    expect(toApiError(new Error('x')).code).toBe('UNKNOWN');
  });
});

describe('interceptor', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('tự gắn token vào header Authorization', async () => {
    tokenStore.set('my-token');
    const handler = (client.interceptors.request as unknown as { handlers: { fulfilled: (c: unknown) => unknown }[] })
      .handlers[0];
    const config = handler.fulfilled({ headers: new AxiosHeaders() }) as InternalAxiosRequestConfig;
    expect(config.headers.Authorization).toBe('Bearer my-token');
  });

  it('request CÓ token bị 401 → xóa token và phát sự kiện hết phiên', async () => {
    tokenStore.set('old-token');
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    const handler = (
      client.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }
    ).handlers[0];

    await expect(handler.rejected(apiError(401, { code: 'TOKEN_EXPIRED' }, true))).rejects.toBeTruthy();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('TOKEN_EXPIRED');
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('đăng nhập sai (401 nhưng KHÔNG gửi token) → không đụng tới phiên hiện tại', async () => {
    tokenStore.set('keep-me');
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    const handler = (
      client.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }
    ).handlers[0];

    await expect(handler.rejected(apiError(401, { code: 'INVALID_CREDENTIALS' }, false))).rejects.toBeTruthy();

    expect(localStorage.getItem(TOKEN_KEY)).toBe('keep-me');
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
});
