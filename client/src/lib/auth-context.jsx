import { createContext, useContext, useState, useEffect } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  fetchMe,
  getToken,
  setToken,
  removeToken,
} from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        removeToken();
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiLogin({ email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(fullName, email, password) {
    const data = await apiRegister({ fullName, email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export default AuthProvider;
