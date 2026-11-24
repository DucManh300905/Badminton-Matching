import react from '@vitejs/plugin-react';
// defineConfig của Vitest = của Vite + khóa `test`
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // /uploads (ảnh người dùng tải lên) lấy từ backend; trên máy chủ Nginx phục vụ cùng tên miền
  server: { port: 5173, proxy: { '/uploads': 'http://localhost:8080' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
