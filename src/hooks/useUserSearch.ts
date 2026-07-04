"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { ApiError } from "@/lib/api/client";
import { userSearchOptions } from "@/lib/api/queries/user";
import type { UserSearchResult } from "@/lib/api/types";

import { useDebouncedValue } from "./useDebouncedValue";

export const USER_SEARCH_DEBOUNCE_MS = 150;
export const USER_SEARCH_SIZE = 8;

export function useUserSearch(query: string): UseQueryResult<UserSearchResult, ApiError> {
  const debouncedQuery = useDebouncedValue(query.trim(), USER_SEARCH_DEBOUNCE_MS);
  return useQuery(userSearchOptions({ query: debouncedQuery, size: USER_SEARCH_SIZE }));
}
