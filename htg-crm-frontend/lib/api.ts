import { getSession, signIn } from "next-auth/react";

type ApiEnvelope<T> = {
  data: T | null;
  error: null | {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await getSession();
  const token = typeof session?.accessToken === "string" ? session.accessToken : undefined;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    throw new ApiError(401, "UNAUTHORIZED", "Session expired. Please refresh the page.");
  }

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? "INTERNAL_ERROR",
      body.error?.message ?? "Request failed",
      body.error?.details,
    );
  }

  return body.data as T;
}
