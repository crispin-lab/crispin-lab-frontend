import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import { redirectToLogin } from "@/lib/auth/redirect";

function isInvalidSession(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === "INVALID_SESSION";
}

// query 는 isError inline UI 가 받으므로 toast 안 띄움. mutation 은 사용자 액션 직후 피드백 필요해 toast — 의도된 비대칭.
export function handleQueryError(error: unknown): void {
  if (isInvalidSession(error)) redirectToLogin();
}

export function handleMutationError(error: unknown): void {
  if (isInvalidSession(error)) {
    redirectToLogin();
    return;
  }
  toast.error(toUserMessage(error));
}
