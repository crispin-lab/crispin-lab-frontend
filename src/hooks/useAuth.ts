"use client";

import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { LoginInput } from "@/lib/api/types";
import type { SignupInput } from "@/lib/schemas/auth";

type BffOk = { ok: true };

// INVALID_SESSION 은 providers.tsx 가 redirect 로 처리 — 토스트 중복 시 hard reload 직전 깜빡임.
function isHandledByGlobalGuard(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === "INVALID_SESSION";
}

function notifyError(error: unknown): void {
  if (isHandledByGlobalGuard(error)) return;
  toast.error(toUserMessage(error));
}

export function useLogin(): UseMutationResult<BffOk, ApiError, LoginInput> {
  const queryClient = useQueryClient();
  return useMutation<BffOk, ApiError, LoginInput>({
    mutationFn: (body) => apiFetch<BffOk>("/api/auth/login", { method: "POST", body }),
    onSuccess: () => {
      queryClient.clear();
    },
    onError: notifyError,
  });
}

export function useSignup(): UseMutationResult<BffOk, ApiError, SignupInput> {
  const queryClient = useQueryClient();
  return useMutation<BffOk, ApiError, SignupInput>({
    mutationFn: (body) => apiFetch<BffOk>("/api/auth/signup", { method: "POST", body }),
    onSuccess: () => {
      queryClient.clear();
    },
    onError: notifyError,
  });
}
