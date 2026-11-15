"use client";

/**
 * Client-side auth state shared across the app.
 *
 * The JWT lives in localStorage (see lib/api.ts). On mount the provider
 * calls GET /api/auth/me to turn a stored token into a user, and clears
 * the token if the backend rejects it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiFetch, clearToken, getToken, setToken } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been checked on first load. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return Boolean(getToken());
    }
    return false;
  });

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<User>("/api/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback((auth: AuthResponse) => {
    setToken(auth.access_token);
    setUser(auth.user);
    return auth.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) =>
      startSession(
        await apiFetch<AuthResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      ),
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) =>
      startSession(
        await apiFetch<AuthResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      ),
    [startSession],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
