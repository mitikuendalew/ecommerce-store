"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./client";
import type { User } from "./types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: User | null;
  status: Status;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  setUser(user: User): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((d) => {
        setUserState(d.user);
        setStatus("authenticated");
      })
      .catch(() => setStatus("anonymous"));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const d = await api<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUserState(d.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const d = await api<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUserState(d.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUserState(null);
    setStatus("anonymous");
  }, []);

  const setUser = useCallback((u: User) => setUserState(u), []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, setUser }),
    [user, status, login, register, logout, setUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
