import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { PageId } from "@/lib/api/ids";
import { createPage, type PageSearchParams, updatePage } from "@/lib/api/page";
import { pageDetailOptions, pageKeys, pageListOptions } from "@/lib/api/queries/page";
import type {
  Page,
  PageCreateRequest,
  PageCreateResult,
  PageSearchResult,
  PageUpdateRequest,
  PageUpdateResult,
} from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function usePage(
  pageId: PageId,
  overrides?: QueryOverrides<Page>,
): UseQueryResult<Page, ApiError> {
  return useQuery({ ...pageDetailOptions(pageId), ...overrides });
}

export function usePageList(
  params: PageSearchParams,
  overrides?: QueryOverrides<PageSearchResult>,
): UseQueryResult<PageSearchResult, ApiError> {
  return useQuery({ ...pageListOptions(params), ...overrides });
}

export type PageUpdateVariables = {
  pageId: PageId;
  body: PageUpdateRequest;
};

export function usePageUpdate(): UseMutationResult<
  PageUpdateResult,
  ApiError,
  PageUpdateVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, body }) => updatePage(pageId, body),
    onSuccess: (_result, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
  });
}

export function usePageCreate(): UseMutationResult<PageCreateResult, ApiError, PageCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createPage(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
  });
}
