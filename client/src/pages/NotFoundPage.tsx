import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="mb-2 font-display text-4xl font-bold text-navy">404</h1>
      <p className="mb-6 text-text-muted">Page not found</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 min-h-[44px] font-medium text-white hover:bg-primary-dark transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
