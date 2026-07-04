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

export function useSpaceMemberInvite(
  spaceId: SpaceId,
): UseMutationResult<SpaceMemberJoinResult, ApiError, SpaceMemberJoinRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => joinSpaceMember(spaceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceMemberKeys.listBySpace(spaceId) });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceMemberKeys.listBySpace(spaceId) });
    },
  });
}

export function useSpaceMemberRemove(spaceId: SpaceId): UseMutationResult<void, ApiError, UserId> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => removeSpaceMember(spaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceMemberKeys.listBySpace(spaceId) });
    },
  });
}
