import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await API.get('/auth/me');
        if (!cancelled) setUser(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to fetch user', err);
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const storeSession = (data) => {
    // eslint-disable-next-line no-unused-vars
    const { token: newToken, ...currentUser } = data.user || data;
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(currentUser);
    return currentUser;
  };

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    return storeSession(res.data);
  };

  const register = async (name, email, password, department, designation) => {
    const res = await API.post('/auth/register', { name, email, password, department, designation });
    return storeSession(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
