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
  /**
   * True when the signed-in user is an owner, manager or staff member of at
   * least one hotel, i.e. when the manager area has something for them.
   */
  managesHotels: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start as loading on both server and client: the server can't see the
  // stored token, so deciding from localStorage here would render different
  // HTML in the browser and cause a hydration mismatch.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Without a token there is nothing to check; resolving through the same
    // promise chain keeps every state update out of the effect body.
    const restore = getToken()
      ? apiFetch<User>("/api/auth/me")
      : Promise.resolve(null);
    restore
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

  // Which user the membership answer belongs to, so a stale answer from a
  // previous session is never shown for the next one.
  const [membership, setMembership] = useState<{ userId: number; managesHotels: boolean } | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    apiFetch<unknown[]>("/api/manager/hotels").then(
      (hotels) => {
        if (!cancelled) setMembership({ userId, managesHotels: hotels.length > 0 });
      },
      () => {
        // Can't tell: hide the manager link rather than show a dead end.
        if (!cancelled) setMembership({ userId, managesHotels: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const managesHotels =
    userId !== null && membership?.userId === userId && membership.managesHotels;

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
    () => ({ user, loading, managesHotels, login, register, logout }),
    [user, loading, managesHotels, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
