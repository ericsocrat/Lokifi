"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me, login, register as registerApi, logout as logoutApi } from "@/src/lib/auth";

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
  register: (email: string, password: string, full_name: string, username?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      console.log('🔄 AuthProvider: Refreshing user data...');
      const response = await me();
      // Backend returns { user: {...}, profile: {...} }
      if (response.user) {
        console.log('✅ AuthProvider: User data received:', response.user.email);
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
    } catch (error) {
      console.log('❌ AuthProvider: Failed to get user data:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        console.log('🔐 AuthProvider: Logging in...');
        await login(email, password);
        console.log('🔐 AuthProvider: Login successful, refreshing user data...');
        await refresh();
      },
      register: async (email, password, full_name, username) => {
        console.log('📝 AuthProvider: Registering...');
        await registerApi(email, password, full_name, username);
        console.log('📝 AuthProvider: Registration successful, refreshing user data...');
        await refresh();
      },
      logout: async () => {
        console.log('🚪 AuthProvider: Logging out...');
        await logoutApi();
        setUser(null);
        console.log('🚪 AuthProvider: Logged out');
      },
      refresh,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
