import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { SpaceId } from "../ids";
import { fetchSpace, listSpaces, type SpaceListParams } from "../space";
import type { Space, SpaceListResult } from "../types";

// list key 는 stable-hash 비교 — `undefined` 필드와 미정의 필드가 같은 key 로 매칭되므로 SpaceListParams 에
// 새 필드가 추가돼도 기존 호출 (그 필드 생략) 의 cache 는 유효.
// 호출부가 리렌더마다 새 객체 리터럴 (`{ page: 0, size: 20 }`) 을 넘겨도 hash 가 같아 cache 식별엔 문제 없음.
// 다만 향후 hook overrides 의 deps 로 options 객체가 쓰일 일이 생기면 `useMemo` 필요.
export const spaceKeys = {
  all: ["space"] as const,
  lists: () => [...spaceKeys.all, "list"] as const,
  list: (params: SpaceListParams) => [...spaceKeys.lists(), params] as const,
  details: () => [...spaceKeys.all, "detail"] as const,
  detail: (spaceId: SpaceId) => [...spaceKeys.details(), spaceId] as const,
};

export function spaceDetailOptions(spaceId: SpaceId) {
  return queryOptions<Space, ApiError>({
    queryKey: spaceKeys.detail(spaceId),
    queryFn: ({ signal }) => fetchSpace(spaceId, signal),
  });
}

export function spaceListOptions(params: SpaceListParams = {}) {
  return queryOptions<SpaceListResult, ApiError>({
    queryKey: spaceKeys.list(params),
    queryFn: ({ signal }) => listSpaces(params, signal),
  });
}
