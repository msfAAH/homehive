import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <Navbar />
      <main
        id="main-scroll"
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-5xl px-4 pt-[72px] pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
