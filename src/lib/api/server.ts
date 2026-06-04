import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { ApiError, type ApiOptions } from "./client";

const UPSTREAM_TIMEOUT_MS = 10_000;

// 만료 session cookie 가 PUBLIC 페이지 열람을 막지 않도록, 호출부가 명시한 GET 호출에 한해
// 401 INVALID_SESSION 을 받으면 Authorization 헤더 없이 한 번 재시도한다.
export type ApiServerOptions = ApiOptions & { allowAnonymousFallback?: boolean };

export async function apiFetchServer<T>(path: string, options: ApiServerOptions = {}): Promise<T> {
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
  const method = options.method ?? "GET";

  const signals: AbortSignal[] = [AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)];
  if (options.signal) signals.push(options.signal);
  const signal = AbortSignal.any(signals);

  const base = backendUrl.replace(/\/$/, "");
  const url = `${base}${path}`;
  const bodyInit = options.body !== undefined ? JSON.stringify(options.body) : undefined;

  const doFetch = (withAuth: boolean) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (withAuth && sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
    return fetch(url, { method, headers, body: bodyInit, signal });
  };

  let response = await doFetch(true);

  if (
    !response.ok &&
    response.status === 401 &&
    options.allowAnonymousFallback === true &&
    sessionToken
  ) {
    response = await doFetch(false);
  }

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
