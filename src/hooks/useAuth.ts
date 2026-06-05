"use client";

import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";

import { type ApiError, apiFetch } from "@/lib/api/client";
import type { LoginInput } from "@/lib/api/types";
import type { SignupInput } from "@/lib/schemas/auth";

type BffOk = { ok: true };

export function useLogin(): UseMutationResult<BffOk, ApiError, LoginInput> {
  const queryClient = useQueryClient();
  return useMutation<BffOk, ApiError, LoginInput>({
    mutationFn: (body) => apiFetch<BffOk>("/api/auth/login", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useSignup(): UseMutationResult<BffOk, ApiError, SignupInput> {
  const queryClient = useQueryClient();
  return useMutation<BffOk, ApiError, SignupInput>({
    mutationFn: (body) => apiFetch<BffOk>("/api/auth/signup", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
