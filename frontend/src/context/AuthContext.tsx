import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { tokenStore } from "@/api/client";
import { authService } from "@/services/auth";
import { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setSession: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const setSession = useCallback((accessToken: string, refreshToken: string, newUser: User) => {
    tokenStore.set(accessToken, refreshToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    authService.logout().catch(() => undefined);
    tokenStore.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, setSession, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
