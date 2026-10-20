import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ModulePage from './pages/ModulePage';
import LessonIntroPage from './pages/LessonIntroPage';
import PlayerPage from './pages/PlayerPage';
import PreviewPage from './pages/PreviewPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/module/:moduleId" element={<ModulePage />} />
        {/* Предпросмотр урока — read-only, без записи прогресса */}
        <Route path="/module/:moduleId/preview/:file" element={<PreviewPage />} />
        {/* Чек-лист материалов перед занятием */}
        <Route path="/lesson/:moduleId/:file/start" element={<LessonIntroPage />} />
        {/* Проигрыватель занятия */}
        <Route path="/lesson/:moduleId/:file" element={<PlayerPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
