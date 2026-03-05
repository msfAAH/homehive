import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const HAS_GOOGLE = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-white text-text focus:outline-none focus:ring-2 focus:ring-slate/30 focus:border-slate transition-colors';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <h1 className="text-3xl font-semibold text-nav" style={{ fontFamily: 'Lora, Georgia, serif' }}>
              Call <span className="text-primary">Hank</span>
            </h1>
          </div>
          <p className="mt-2 text-sm text-text-muted">Your home's best friend. Always on call.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Email</label>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Password</label>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-nav hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {HAS_GOOGLE && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google login failed')}
                  size="large"
                  width="100%"
                  text="signin_with"
                />
              </div>
            </>
          )}

          <p className="mt-5 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
