import { apiClient } from "@/api/client";
import { User } from "@/types";

export interface LoginResponse {
  mfa_required: boolean;
  mfa_token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: User;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export const authService = {
  login: (email: string, password: string, remember_device = false) =>
    apiClient.post<LoginResponse>("/api/auth/login", { email, password, remember_device }).then((r) => r.data),
  verifyMfa: (email: string, code: string) =>
    apiClient.post<TokenResponse>("/api/auth/mfa/verify", { email, code }).then((r) => r.data),
  // Re-confirms an already-authenticated session with just the MFA code — no password needed.
  stepUpVerify: (code: string, context = "") =>
    apiClient.post<{ verified: boolean }>("/api/auth/step-up-verify", { code, context }).then((r) => r.data),
  logout: () => apiClient.post("/api/auth/logout"),
  me: () => apiClient.get<User>("/api/auth/me").then((r) => r.data),
};
