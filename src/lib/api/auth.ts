import { ApiError, apiFetch } from "./client";
import type { Me } from "./types";

// `/v1/users/me` 는 옵셔널 인증 endpoint — 비로그인 (cookie 없음 or invalid) 에서도 헤더가 자연스럽게
// 비로그인 UI 로 분기되도록 401 을 함수 내부에서 흡수한다. 글로벌 `queryErrorHandlers` 의 redirect 도 안 걸린다.
export async function fetchMe(signal?: AbortSignal): Promise<Me | null> {
  try {
    return await apiFetch<Me>("/api/v1/users/me", { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export type LogoutResult = { ok: true };

export function logout(): Promise<LogoutResult> {
  return apiFetch<LogoutResult>("/api/auth/logout", { method: "POST" });
}
