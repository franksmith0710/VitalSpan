import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { apiFetch, registerUnauthorizedHandler } from "@/lib/api";
import { clearAuthToken, getAuthToken } from "@/lib/auth-token";
import type { SessionRole } from "@/lib/session";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  roles: SessionRole[];
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(getAuthToken()));

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const me = await apiFetch<AuthUser>("/api/v1/me");
      setUser({
        id: me.id,
        username: me.username,
        displayName: me.displayName ?? me.username,
        email: me.email ?? `${me.username}@vitalspan.local`,
        roles: me.roles as SessionRole[],
      });
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
    void refresh();
  }, [logout, refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      logout,
      refresh,
    }),
    [user, isLoading, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
