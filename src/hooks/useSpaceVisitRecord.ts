"use client";

import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { SpaceId } from "@/lib/api/ids";
import { spaceKeys } from "@/lib/api/queries/space";
import { recordSpaceVisit } from "@/lib/api/space";

// list 만 invalidate — Space 상세 응답에는 unreadCount 가 없으므로 detail 은 stale 무관.
export function useSpaceVisitRecord(): UseMutationResult<void, ApiError, SpaceId> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordSpaceVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
    },
    meta: { silent: true },
  });
}
