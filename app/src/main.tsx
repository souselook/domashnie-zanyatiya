import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { hydrateProgressCache, loadSettingsAsync } from './core/storage';
import './index.css';

// Bootstrap: прогресс и настройки подтягиваются из IndexedDB до первого рендера,
// чтобы синхронные геттеры в компонентах видели актуальные данные (критерий 5 —
// восстановление прогресса после перезагрузки). Seed выполняется внутри ModuleList
// ровно один раз (флаг hl.seeded.v1).
async function bootstrap() {
  try {
    await Promise.all([hydrateProgressCache(), loadSettingsAsync()]);
  } catch {
    // приватный режим / недоступный IndexedDB — работаем на localStorage-зеркале
  }
}

void bootstrap().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
});
