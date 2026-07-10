import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { SpaceId } from "@/lib/api/ids";
import { pageKeys } from "@/lib/api/queries/page";
import { spaceDetailOptions, spaceKeys, spaceListOptions } from "@/lib/api/queries/space";
import { createSpace, deleteSpace, editSpace, type SpaceListParams } from "@/lib/api/space";
import type {
  Space,
  SpaceCreateRequest,
  SpaceCreateResult,
  SpaceEditRequest,
  SpaceEditResult,
  SpaceListResult,
} from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function useSpaceList(
  params: SpaceListParams = {},
  overrides?: QueryOverrides<SpaceListResult>,
): UseQueryResult<SpaceListResult, ApiError> {
  return useQuery({ ...spaceListOptions(params), ...overrides });
}

export function useSpaceDetail(
  spaceId: SpaceId,
  overrides?: QueryOverrides<Space>,
): UseQueryResult<Space, ApiError> {
  return useQuery({ ...spaceDetailOptions(spaceId), ...overrides });
}

export function useSpaceCreate(): UseMutationResult<
  SpaceCreateResult,
  ApiError,
  SpaceCreateRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createSpace(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
    },
  });
}

export function useSpaceEdit(
  spaceId: SpaceId,
): UseMutationResult<SpaceEditResult, ApiError, SpaceEditRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => editSpace(spaceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
    },
  });
}

export function useSpaceDelete(): UseMutationResult<void, ApiError, SpaceId> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId) => deleteSpace(spaceId),
    onSuccess: (_result, spaceId) => {
      // active observer (스페이스 상세 화면) 의 refetch → 404 race 를 피하려고 refetchType: 'none'. 다음 mount 에서 stale 로 인식돼 다시 fetch 된다.
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(spaceId), refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      // 스페이스 ID 로 필터링하는 페이지 목록 (`usePageList({ spaceId })`) 은 결과가 달라질 수 있어 함께 무효.
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
  });
}
