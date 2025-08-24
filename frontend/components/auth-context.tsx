'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { signIn as apiSignIn } from '@/services/api';

type AuthContextValue = {
  username: string | null;
  token: string | null;
  isSignedIn: boolean;
  ready: boolean; // true once sessionStorage has been read
  signIn: (username: string, password: string) => Promise<{ username: string; token: string } | undefined>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load from sessionStorage on first client render
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { username?: string | null; token?: string | null };
        setUsername(parsed.username ?? null);
        setToken(parsed.token ?? null);
      }
    } catch {
      // ignore parse errors
    } finally {
      setReady(true);
    }
  }, []);

  // Persist to sessionStorage whenever values change (after initial load)
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ username, token }));
    } catch {
      // storage might be full/blocked — ignore
    }
  }, [username, token, ready]);

  const signOut = useCallback(() => {
    setUsername(null);
    setToken(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch { }
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    let token: string | null = null;
    try {
      token = await apiSignIn(username, password);
      setUsername(username);
      setToken(token);
    } catch (e) {
      console.error("Sign-in failed:", e);
      signOut(); // clear any partial state
      return
    }
    return { username, token };
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      username,
      token,
      isSignedIn: Boolean(token),
      ready,
      signIn,
      signOut,
    }),
    [username, token, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
