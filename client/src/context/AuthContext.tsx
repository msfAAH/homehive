import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for stored token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Validate token with server
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Invalid token');
          return res.json();
        })
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token is invalid, clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthResponse = useCallback((data: { token: string; user: User }) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    handleAuthResponse(data);
  }, [handleAuthResponse]);

  const signup = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Signup failed');
    }
    const data = await res.json();
    handleAuthResponse(data);
  }, [handleAuthResponse]);

  const googleLogin = useCallback(async (credential: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
    } catch (err) {
      throw new Error('Unable to reach the server. Please check your connection and try again.');
    }
    if (!res.ok) {
      let errorMsg = 'Google login failed';
      try {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } catch { /* response wasn't JSON */ }
      throw new Error(errorMsg);
    }
    const data = await res.json();
    handleAuthResponse(data);
  }, [handleAuthResponse]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
