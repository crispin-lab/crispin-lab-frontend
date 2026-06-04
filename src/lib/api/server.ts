import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { ApiError, type ApiOptions } from "./client";

const UPSTREAM_TIMEOUT_MS = 10_000;

export async function apiFetchServer<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!path.startsWith("/")) {
    throw new Error(`apiFetchServer path must start with '/' (got: ${path})`);
  }
  if (path.startsWith("/api/")) {
    throw new Error(
      `apiFetchServer는 BACKEND_URL 직접 호출용 — '/v1/...' 같은 백엔드 경로를 넘긴다 (got: ${path})`,
    );
  }

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    throw new Error("BACKEND_URL 환경 변수가 설정되어 있지 않습니다.");
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  const signals: AbortSignal[] = [AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)];
  if (options.signal) signals.push(options.signal);

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.any(signals),
  };

  const base = backendUrl.replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, init);

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text === "") return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, "INVALID_JSON", "응답을 해석하지 못했습니다.");
  }
}
