import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// defineConfig của Vitest = của Vite + khóa `test`
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Khi phát triển: mọi request /api được chuyển sang backend Express,
    // nên frontend và API "cùng domain" → cookie đăng nhập hoạt động, không cần CORS.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
