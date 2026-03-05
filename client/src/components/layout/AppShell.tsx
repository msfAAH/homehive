import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div
      className="flex flex-col overflow-hidden bg-nav"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Navbar />
      <main
        id="main-scroll"
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ backgroundColor: '#E1E0D1', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
