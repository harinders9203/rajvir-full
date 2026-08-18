import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((d) => !cancelled && setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const d = await api('/auth/signup', { method: 'POST', body: payload });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const d = await api('/auth/me');
    setUser(d.user);
    return d.user;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, signup, logout, refreshUser, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
