"use client";

import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logout, type LogoutResult } from "@/lib/api/auth";
import { type ApiError, apiFetch } from "@/lib/api/client";
import { meOptions, userKeys } from "@/lib/api/queries/user";
import type { LoginInput, Me } from "@/lib/api/types";
import type { SignupInput } from "@/lib/schemas/auth";

type BffOk = { ok: true };

// 세션이 바뀌면 me 만 재조회. 다른 도메인 (page / space) 은 RSC navigation 으로 자연스럽게 새로 fetch 된다 —
// 인자 없는 invalidateQueries() 는 진행 중인 모든 query 를 같이 무효화해 과도한 재요청을 일으킨다.
export function useLogin(): UseMutationResult<BffOk, ApiError, LoginInput> {
  const queryClient = useQueryClient();
  return useMutation<BffOk, ApiError, LoginInput>({
    mutationFn: (body) => apiFetch<BffOk>("/api/auth/login", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useSignup(): UseMutationResult<BffOk, ApiError, SignupInput> {
  const queryClient = useQueryClient();
  return useMutation<BffOk, ApiError, SignupInput>({
    mutationFn: (body) => apiFetch<BffOk>("/api/auth/signup", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useMe(): UseQueryResult<Me | null, ApiError> {
  return useQuery(meOptions());
}

// onSettled — BFF 5xx 여도 떠난다. router.refresh() 가 anonymous RSC 재진입을 트리거 → 권한 페이지는 SSR 가드가 redirect, PUBLIC 은 머무름.
export function useLogout(): UseMutationResult<LogoutResult, ApiError, void> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation<LogoutResult, ApiError, void>({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.clear();
      router.refresh();
    },
  });
}
