import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { PageId, TagId } from "@/lib/api/ids";
import { attachPageTag, detachPageTag, type PageTagListParams } from "@/lib/api/pageTag";
import { pageTagKeys, pageTagListOptions } from "@/lib/api/queries/pageTag";
import { tagKeys } from "@/lib/api/queries/tag";
import { registerTag } from "@/lib/api/tag";
import type { PageTagListResult, TagRegisterRequest, TagRegisterResult } from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function usePageTagList(
  pageId: PageId,
  params: PageTagListParams = {},
  overrides?: QueryOverrides<PageTagListResult>,
): UseQueryResult<PageTagListResult, ApiError> {
  return useQuery({ ...pageTagListOptions(pageId, params), ...overrides });
}

export type PageTagAttachVariables = {
  pageId: PageId;
  tagId: TagId;
};

export function usePageTagAttach(): UseMutationResult<void, ApiError, PageTagAttachVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, tagId }) => attachPageTag(pageId, { tagId }),
    // Promise 반환 — `mutateAsync` 가 refetch 완료까지 resolve 되지 않게. popover 가 닫히는 시점에 자동완성 source 가 fresh.
    onSuccess: (_result, { pageId }) =>
      queryClient.invalidateQueries({ queryKey: [...pageTagKeys.lists(), pageId] }),
  });
}

export type PageTagDetachVariables = {
  pageId: PageId;
  tagId: TagId;
};

export function usePageTagDetach(): UseMutationResult<void, ApiError, PageTagDetachVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, tagId }) => detachPageTag(pageId, tagId),
    onSuccess: (_result, { pageId }) =>
      queryClient.invalidateQueries({ queryKey: [...pageTagKeys.lists(), pageId] }),
  });
}

export function useTagRegister(): UseMutationResult<
  TagRegisterResult,
  ApiError,
  TagRegisterRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => registerTag(body),
    // 해당 spaceId 의 자동완성 source 만 invalidate — 다른 스페이스 dropdown 의 silent refetch 회피. Promise 반환으로 refetch 완료까지 대기.
    onSuccess: (_result, { spaceId }) =>
      queryClient.invalidateQueries({ queryKey: [...tagKeys.spaceLists(), spaceId] }),
  });
}
