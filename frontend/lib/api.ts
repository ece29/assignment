const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "task_manager_access_token";
const USER_KEY = "task_manager_user";

type FetchOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
};

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function storeUser(user: unknown) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser<T>() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(USER_KEY);
  return value ? (JSON.parse(value) as T) : null;
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = getStoredAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (response.status === 401 && options.auth && !options.skipRefresh) {
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload as T;
}

export async function tryRefreshToken() {
  try {
    const payload = await apiFetch<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      skipRefresh: true
    });

    storeAccessToken(payload.accessToken);
    return true;
  } catch {
    clearAccessToken();
    clearStoredUser();
    return false;
  }
}
