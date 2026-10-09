"use client";

import { useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from "react";
import { api } from "../api/client";
import type { AuthUser } from "../api/client";
import type { AuthContextValue } from "./authTypes";
import { AuthContext } from "./authContext";

const USER_KEY = "rivowear-user";
const TOKEN_KEY = "rivowear-token";

// The login lives in localStorage. useSyncExternalStore lets the server render "logged out"
// and then switch to the real value in the browser without a hydration mismatch.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};
const snapshot = () => `${localStorage.getItem(TOKEN_KEY) ?? ""}\n${localStorage.getItem(USER_KEY) ?? ""}`;
const serverSnapshot = () => "\n";

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emit();
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const { token, user } = useMemo(() => {
    const [tokenPart = "", userPart = ""] = raw.split("\n");
    let parsed: AuthUser | null = null;
    try {
      parsed = userPart ? (JSON.parse(userPart) as AuthUser) : null;
    } catch {
      parsed = null;
    }
    return { token: tokenPart || null, user: parsed };
  }, [raw]);

  // Confirm the saved token is still valid (it expires after 7 days) and refresh the role.
  useEffect(() => {
    if (!token) return;
    api
      .me(token)
      .then(({ user: fresh }) => {
        if (JSON.stringify(fresh) !== JSON.stringify(user)) {
          localStorage.setItem(USER_KEY, JSON.stringify(fresh));
          emit();
        }
      })
      .catch(() => clearSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      async login(contact, password) {
        const response = await api.login(contact, password);
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        emit();
        return response.user;
      },
      async register(name, contact, password) {
        await api.register(name, contact, password);
      },
      updateSession({ token: newToken, user: newUser }) {
        if (newToken) localStorage.setItem(TOKEN_KEY, newToken);
        if (newUser) localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        emit();
      },
      async logout() {
        if (token) await api.logout(token).catch(() => undefined);
        clearSession();
      },
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
