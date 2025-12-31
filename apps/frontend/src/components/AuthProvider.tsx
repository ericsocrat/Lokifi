'use client';

import { login, logout as logoutApi, me, register as registerApi } from '@/lib/api/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type User = {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    full_name: string,
    username?: string
  ) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Memoize refresh function to prevent unnecessary re-renders
  const refresh = useCallback(async () => {
    try {
      const response = await me();
      // Backend returns { user: {...}, profile: {...} }
      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          full_name: response.user.full_name,
          username: response.profile?.username,
          avatar_url: response.profile?.avatar_url,
          bio: response.profile?.bio,
          created_at: response.user.created_at,
        });
      }
    } catch (_error) {
      // Silent fail - user just needs to log in again
      console.debug('Auth refresh failed - user not logged in');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Memoize login function to prevent re-renders
  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password);
      await refresh();
    },
    [refresh]
  );

  // Memoize register function to prevent re-renders
  const handleRegister = useCallback(
    async (email: string, password: string, full_name: string, username?: string) => {
      await registerApi(email, password, full_name, username);
      await refresh();
    },
    [refresh]
  );

  // Memoize logout function to prevent re-renders
  const handleLogout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refresh,
    }),
    [user, loading, handleLogin, handleRegister, handleLogout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
