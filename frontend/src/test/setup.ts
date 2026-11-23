import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// Node 25 có sẵn `localStorage` toàn cục (Web Storage), nhưng không dùng được nếu thiếu cờ
// --localstorage-file, và nó che mất localStorage của jsdom. Khi đó thay bằng bản chạy trong bộ nhớ.
if (typeof globalThis.localStorage?.clear !== 'function') {
  class MemoryStorage implements Storage {
    private data = new Map<string, string>();
    get length() {
      return this.data.size;
    }
    clear() {
      this.data.clear();
    }
    getItem(key: string) {
      return this.data.get(key) ?? null;
    }
    key(index: number) {
      return [...this.data.keys()][index] ?? null;
    }
    removeItem(key: string) {
      this.data.delete(key);
    }
    setItem(key: string, value: string) {
      this.data.set(key, String(value));
    }
  }
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}
