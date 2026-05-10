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

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("madani_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("madani_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("madani_token");
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "omit",
    body:
      options.body && !isFormData && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : (options.body as BodyInit | null | undefined),
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    const error = new Error(payload.message || "Request gagal");
    (error as Error & { payload?: ApiResponse<T>; status?: number }).payload = payload;
    (error as Error & { payload?: ApiResponse<T>; status?: number }).status =
      response.status;
    throw error;
  }

  return payload;
}
