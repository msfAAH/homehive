import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pt-[72px]" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>
    </div>
  );
}
