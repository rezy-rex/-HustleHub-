// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  role: 'client' | 'freelancer' | 'admin' | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; role: 'client' | 'freelancer' }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [role, setRole] = useState<'client' | 'freelancer' | 'admin' | null>(() => {
    return (localStorage.getItem('role') as 'client' | 'freelancer' | 'admin') || null;
  });
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
          setRole(res.user.role);
          localStorage.setItem('role', res.user.role);
          localStorage.setItem('user', JSON.stringify(res.user));
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    }

    loadUser();
  }, [token]);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authApi.login(credentials);
    setToken(res.token);
    setUser(res.user);
    setRole(res.user.role);

    localStorage.setItem('token', res.token);
    localStorage.setItem('role', res.user.role);
    localStorage.setItem('user', JSON.stringify(res.user));
  };

  const register = async (data: { email: string; password: string; role: 'client' | 'freelancer' }) => {
    await authApi.register(data);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
