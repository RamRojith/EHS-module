import * as React from 'react';
import type { Role, User } from '@/data/types';
import { authenticate } from '@/data/generate';
import { DEFAULT_SETTINGS, getRoleById } from '@/data/settings';

const STORAGE_KEY = 'ehs.session.v1';

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (employeeId: string, password: string, remember?: boolean) => { ok: boolean; error?: string };
  logout: () => void;
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function useRole(): Role | null {
  return useAuth().role;
}

/** Convenience guard for route elements. */
export function usePermission(permission: string): boolean {
  return useAuth().can(permission);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Session restore is synchronous in practice; the timeout keeps the splash
    // honest if it ever becomes async (API swap).
    const restore = () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw) as User);
      } catch {
        /* corrupt session – fall back to the login screen */
      }
      setIsReady(true);
    };
    const t = window.setTimeout(restore, 0);
    return () => window.clearTimeout(t);
  }, []);

  const login = React.useCallback<AuthContextValue['login']>((employeeId, password, remember = true) => {
    const found = authenticate(employeeId, password);
    if (!found) {
      return { ok: false, error: 'Invalid employee ID or password. Try one of the demo logins below.' };
    }
    const user: User = {
      ...found,
      lastLogin: new Date().toISOString(),
    };
    setUser(user);
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(STORAGE_KEY);
    store.setItem(STORAGE_KEY, JSON.stringify(user));
    return { ok: true };
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const role = React.useMemo(() => (user ? getRoleById(user.roleId) : null), [user]);

  const can = React.useCallback(
    (permission: string) => {
      if (!role) return false;
      if (role.permissions.includes('*')) return true;
      if (role.permissions.includes(permission)) return true;
      // `capa` implies `capa:create` / `capa:update`
      const [base] = permission.split(':');
      return role.permissions.includes(base);
    },
    [role],
  );

  const canAny = React.useCallback(
    (...permissions: string[]) => permissions.some((p) => can(p)),
    [can],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, role, isAuthenticated: !!user, isReady, login, logout, can, canAny }),
    [user, role, isReady, login, logout, can, canAny],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { DEFAULT_SETTINGS };
