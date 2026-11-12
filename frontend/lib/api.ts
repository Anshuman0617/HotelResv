/**
 * API client for the FastAPI backend.
 *
 * Every backend response uses the envelope { success, message, data }.
 * apiFetch() unwraps it and returns `data`, or throws ApiError.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const TOKEN_KEY = "hotelresv_token";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { ...init, headers });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON or empty body; handled below.
  }

  const envelope = body as Partial<ApiResponse<T>> | null;
  if (!response.ok || !envelope || envelope.success === false) {
    // FastAPI HTTPException responses use { detail }, the envelope uses { message }.
    const detail = (body as { detail?: unknown } | null)?.detail;
    const message =
      envelope?.message ??
      (typeof detail === "string" ? detail : null) ??
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return envelope.data as T;
}
