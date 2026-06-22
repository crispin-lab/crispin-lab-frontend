import { ApiError } from "./client";
import { apiFetchServer, type ApiServerOptions } from "./server";
import type { Me } from "./types";

// 비로그인 / 만료 세션을 throw 가 아니라 null 로 반환 — page reading 흐름을 끊지 않게.
export async function fetchMeServer(options?: ApiServerOptions): Promise<Me | null> {
  try {
    return await apiFetchServer<Me>("/v1/users/me", options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
