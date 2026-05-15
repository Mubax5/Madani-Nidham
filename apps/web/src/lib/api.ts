export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
  errors?: Record<string, string[]>;
};

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const TOKEN_KEY = "madani_token";
const SESSION_KEY = "madani_session_key";
export const AUTH_CHANGED_EVENT = "madani:auth-changed";

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function tokenFingerprint(token: string) {
  return `${token.slice(0, 10)}:${token.slice(-10)}`;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getAuthSessionKey() {
  if (typeof window === "undefined") return "guest";
  const token = getToken();
  if (!token) return "guest";

  const stored = window.localStorage.getItem(SESSION_KEY);
  return stored || tokenFingerprint(token);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(
    SESSION_KEY,
    `${Date.now()}:${tokenFingerprint(token)}`,
  );
  emitAuthChanged();
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  emitAuthChanged();
}

export function scopedQueryKey(key: readonly unknown[]) {
  return ["session", getAuthSessionKey(), ...key] as const;
}

function safeErrorMessage(status?: number, path = "") {
  if (status === 401) return "Sesi berakhir. Silakan login ulang.";
  if (status === 403) return "Akun ini tidak punya akses ke fitur tersebut.";
  if (status === 404) return "Data yang dicari tidak ditemukan.";
  if (status === 422 && path === "/auth/login") {
    return "Email atau password belum sesuai.";
  }
  if (status === 422 && path.startsWith("/auth/google")) {
    return "Login Google belum tersedia saat ini.";
  }
  if (status === 422) return "Data belum valid. Periksa kembali isian.";
  if (status && status >= 500) {
    return "Layanan sedang bermasalah. Coba lagi beberapa saat lagi.";
  }
  return "Permintaan gagal diproses.";
}

export function friendlyErrorMessage(error: unknown, fallback = "Permintaan gagal diproses.") {
  if (!(error instanceof Error)) return fallback;

  const raw = error.message.toLowerCase();
  if (
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("load failed") ||
    raw.includes("fetch failed") ||
    raw.includes("network request failed")
  ) {
    return "Aplikasi belum bisa terhubung ke server. Periksa koneksi lalu coba lagi.";
  }

  if (raw.includes("aborted") || raw.includes("timeout")) {
    return "Koneksi terlalu lama merespons. Coba lagi beberapa saat lagi.";
  }

  return error.message || fallback;
}

export async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & {
    body?: BodyInit | Record<string, unknown> | null;
  } = {},
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "omit",
      body:
        options.body && !isFormData && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : (options.body as BodyInit | null | undefined),
    });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }

  let payload: ApiResponse<T> | undefined;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = undefined;
  }

  if (!response.ok || !payload?.success) {
    if (response.status === 401 && token) {
      clearToken();
    }
    const error = new Error(safeErrorMessage(response.status, path));
    (error as Error & { payload?: ApiResponse<T>; status?: number }).payload =
      payload;
    (error as Error & { payload?: ApiResponse<T>; status?: number }).status =
      response.status;
    throw error;
  }

  return payload;
}
