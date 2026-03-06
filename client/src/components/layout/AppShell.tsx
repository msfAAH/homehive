import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div
      className="flex flex-col overflow-hidden bg-navy"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Navbar />
      <main
        id="main-scroll"
        className="flex-1 overflow-y-auto overscroll-contain bg-cream"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
