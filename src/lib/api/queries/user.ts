import { queryOptions } from "@tanstack/react-query";

import { fetchMe } from "../auth";
import type { ApiError } from "../client";
import type { Me, UserSearchResult } from "../types";
import { searchUsers, type UserSearchParams } from "../user";

export const userKeys = {
  all: ["user"] as const,
  me: () => [...userKeys.all, "me"] as const,
  searches: () => [...userKeys.all, "search"] as const,
  search: (params: UserSearchParams) => [...userKeys.searches(), params] as const,
};

export function meOptions() {
  return queryOptions<Me | null, ApiError>({
    queryKey: userKeys.me(),
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 5 * 60_000,
  });
}

// 호출부는 반드시 `useUserSearch` 를 경유해 debounced query 를 넘긴다 — 이 factory 를 직접 호출하면
// 매 키스트로크마다 fetch 하는 회귀가 생긴다.
export function userSearchOptions(params: UserSearchParams) {
  return queryOptions<UserSearchResult, ApiError>({
    queryKey: userKeys.search(params),
    queryFn: ({ signal }) => searchUsers(params, signal),
    staleTime: 30_000,
    enabled: params.query !== "",
  });
}
