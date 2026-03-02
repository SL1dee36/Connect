import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  immediate: true,               
  onNeedRefresh() {
    console.log('Новая версия доступна — обновить?');
  },
  onOfflineReady() {
    console.log('Приложение готово к работе оффлайн');
  },
  onRegistered(r) {
    console.log('Service Worker зарегистрирован:', r?.scope);
  },
  onRegisterError(error) {
    console.error('Ошибка регистрации SW:', error);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);