import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { SpaceId } from "../ids";
import { listSpaceMembers, type SpaceMemberListParams } from "../spaceMember";
import type { SpaceMemberListResult } from "../types";

export const spaceMemberKeys = {
  all: ["spaceMember"] as const,
  lists: () => [...spaceMemberKeys.all, "list"] as const,
  // 같은 스페이스의 모든 pagination variant 를 한 번에 invalidate 하기 위한 중간 계층.
  // `lists()` 를 invalidate 하면 다른 스페이스의 멤버 리스트까지 무효화되어 불필요한 fetch 를 유발한다.
  listBySpace: (spaceId: SpaceId) => [...spaceMemberKeys.lists(), spaceId] as const,
  list: (spaceId: SpaceId, params: SpaceMemberListParams) =>
    [...spaceMemberKeys.listBySpace(spaceId), params] as const,
};

export function spaceMemberListOptions(spaceId: SpaceId, params: SpaceMemberListParams = {}) {
  return queryOptions<SpaceMemberListResult, ApiError>({
    queryKey: spaceMemberKeys.list(spaceId, params),
    queryFn: ({ signal }) => listSpaceMembers(spaceId, params, signal),
    staleTime: 30_000,
  });
}
