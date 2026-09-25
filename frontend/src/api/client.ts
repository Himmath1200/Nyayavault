import axios, { AxiosError } from "axios";

const TOKEN_KEY = "nyayavault_access_token";
const REFRESH_KEY = "nyayavault_refresh_token";

export const tokenStore = {
  getAccess: () => sessionStorage.getItem(TOKEN_KEY),
  getRefresh: () => sessionStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    sessionStorage.setItem(TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};

// If VITE_API_BASE_URL is set (e.g. a real deployment with the API on its own domain), use
// it. Otherwise, default to whatever hostname the browser is actually using — localhost,
// 127.0.0.1, or a LAN IP — so opening the app from a phone via the dev machine's LAN address
// (needed for QR codes to be scannable) just works, without editing .env every time that
// address changes across sessions (it's DHCP-assigned and not stable).
const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8000`;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiBase,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const resp = await axios.post(`${apiClient.defaults.baseURL}/api/auth/refresh`, { refresh_token: refresh });
    tokenStore.set(resp.data.access_token, resp.data.refresh_token);
    return resp.data.access_token;
  } catch {
    tokenStore.clear();
    return null;
  }
}

// A request made with responseType "arraybuffer"/"blob" (used to fetch document bytes for
// preview/download) gets its ERROR responses undecoded too — a 403 JSON body arrives as raw
// bytes, not a parsed object. Normalize it here so every other error handler in the app can
// keep reading `error.response.data.detail` the same way regardless of responseType.
function decodeBinaryErrorBody(error: AxiosError) {
  const data = error.response?.data;
  const contentType = error.response?.headers?.["content-type"];
  const isBinary = data instanceof ArrayBuffer || data instanceof Blob;
  if (!isBinary || typeof contentType !== "string" || !contentType.includes("application/json")) return;
  try {
    const text = data instanceof ArrayBuffer ? new TextDecoder().decode(data) : null;
    if (text !== null && error.response) {
      error.response.data = JSON.parse(text);
    }
  } catch {
    // Leave data as-is if it isn't valid JSON after all.
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    decodeBinaryErrorBody(error);
    const original = error.config;
    if (error.response?.status === 401 && original && !(original as { _retry?: boolean })._retry) {
      (original as { _retry?: boolean })._retry = true;
      if (!refreshPromise) {
        refreshPromise = tryRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(original);
      }
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
    if (error.message === "Network Error") return "Cannot reach the NyayaVault server. Check your connection.";
  }
  return fallback;
}
