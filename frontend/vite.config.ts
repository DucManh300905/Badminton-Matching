import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// defineConfig của Vitest = của Vite + khóa `test`
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
