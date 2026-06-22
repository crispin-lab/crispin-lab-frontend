import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import { redirectToLogin } from "@/lib/auth/redirect";

function isInvalidSession(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === "INVALID_SESSION";
}

// query 의 401 은 silent — 각 useQuery 의 isError inline UI 가 흡수. PUBLIC 페이지 reading 중 auth-only 서브 쿼리 (예: 태그) 가 401 받아도 본문 흐름을 끊지 않게.
// auth 가 필요한 라우트는 SSR 에서 redirect, mutation 은 사용자 액션이라 redirect + toast 유지.
export function handleQueryError(error: unknown): void {
  void error;
}

export function handleMutationError(error: unknown): void {
  if (isInvalidSession(error)) {
    redirectToLogin();
    return;
  }
  toast.error(toUserMessage(error));
}
