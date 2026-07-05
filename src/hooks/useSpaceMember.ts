"use client";

import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { SpaceId, UserId } from "@/lib/api/ids";
import { pageKeys } from "@/lib/api/queries/page";
import { spaceKeys } from "@/lib/api/queries/space";
import { spaceMemberKeys, spaceMemberListOptions } from "@/lib/api/queries/spaceMember";
import {
  changeSpaceMemberRole,
  joinSpaceMember,
  removeSpaceMember,
  type SpaceMemberListParams,
} from "@/lib/api/spaceMember";
import type {
  SpaceMemberJoinRequest,
  SpaceMemberJoinResult,
  SpaceMemberListResult,
  SpaceMemberRole,
  SpaceMemberRoleChangeResult,
} from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function useSpaceMemberList(
  spaceId: SpaceId,
  params: SpaceMemberListParams = {},
  overrides?: QueryOverrides<SpaceMemberListResult>,
): UseQueryResult<SpaceMemberListResult, ApiError> {
  return useQuery({ ...spaceMemberListOptions(spaceId, params), ...overrides });
}

// 멤버 mutation 이 성공하면 파생 상태 (space canWrite / viewerRole / 페이지 가시성 필터) 도 stale 해진다.
// useSpaceDelete 패턴처럼 세 곳을 함께 invalidate — 멤버 리스트, 스페이스 상세, 페이지 리스트.
function invalidateMemberDerivedState(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: SpaceId,
): void {
  queryClient.invalidateQueries({ queryKey: spaceMemberKeys.listBySpace(spaceId) });
  queryClient.invalidateQueries({ queryKey: spaceKeys.detail(spaceId) });
  queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
}

export function useSpaceMemberInvite(
  spaceId: SpaceId,
): UseMutationResult<SpaceMemberJoinResult, ApiError, SpaceMemberJoinRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => joinSpaceMember(spaceId, body),
    onSuccess: () => invalidateMemberDerivedState(queryClient, spaceId),
  });
}

export type SpaceMemberRoleChangeInput = {
  userId: UserId;
  role: SpaceMemberRole;
};

export function useSpaceMemberRoleChange(
  spaceId: SpaceId,
): UseMutationResult<SpaceMemberRoleChangeResult, ApiError, SpaceMemberRoleChangeInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => changeSpaceMemberRole(spaceId, userId, { role }),
    onSuccess: () => invalidateMemberDerivedState(queryClient, spaceId),
  });
}

export function useSpaceMemberRemove(spaceId: SpaceId): UseMutationResult<void, ApiError, UserId> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => removeSpaceMember(spaceId, userId),
    onSuccess: () => invalidateMemberDerivedState(queryClient, spaceId),
  });
}
