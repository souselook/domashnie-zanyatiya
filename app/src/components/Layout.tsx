import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/70 backdrop-blur border-b border-sand sticky top-0 z-10">
        <nav aria-label="Главная навигация"
             className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-xl font-extrabold text-cocoa no-underline">
            🏡 Домашние занятия
          </Link>
          <span className="flex-1" />
          <Link to="/progress" className="btn-secondary !min-h-[44px] !py-2 text-sm">Прогресс</Link>
          <Link to="/settings" className="btn-secondary !min-h-[44px] !py-2 text-sm">Настройки</Link>
        </nav>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="text-center text-sm text-cocoa/50 py-4">
        Занятия проходят дома, вместе с родителем. Без оценок и рейтингов.
      </footer>
    </div>
  );
}
