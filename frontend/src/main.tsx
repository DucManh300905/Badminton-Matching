import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles.css';
import { applyTheme, readTheme, watchSystemTheme } from './utils/theme';

// Chế độ sáng / tối: index.html đã đặt trước khi vẽ; ở đây đồng bộ lại và theo dõi khi máy đổi chế độ
applyTheme(readTheme());
watchSystemTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
