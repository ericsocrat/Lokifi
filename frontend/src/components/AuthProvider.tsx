"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me, login, register as registerApi, logout as logoutApi } from "@/src/lib/auth";

type User = { handle: string; avatar_url?: string; bio?: string; created_at: string } | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (handle: string, password: string) => Promise<void>;
  register: (handle: string, password: string, avatar_url?: string, bio?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try { const u = await me(); setUser(u); } catch { setUser(null); }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    login: async (handle, password) => {
      await login(handle, password);
      await refresh();
    },
    register: async (handle, password, avatar_url, bio) => {
      await registerApi(handle, password, avatar_url, bio);
      await refresh();
    },
    logout: () => { logoutApi(); setUser(null); },
    refresh,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
