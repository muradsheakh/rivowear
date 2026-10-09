import type { AuthUser } from "../api/client";

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (contact: string, password: string) => Promise<AuthUser>;
  register: (name: string, contact: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Used by the account screens after the profile or login changes. */
  updateSession: (changes: { token?: string; user?: AuthUser }) => void;
};
