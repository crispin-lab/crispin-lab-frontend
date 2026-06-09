import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { SpaceId } from "../ids";
import { fetchSpace, listSpaces, type SpaceListParams } from "../space";
import type { Space, SpaceListResult } from "../types";

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
    staleTime: 30_000,
  });
}

export function spaceListOptions(params: SpaceListParams = {}) {
  return queryOptions<SpaceListResult, ApiError>({
    queryKey: spaceKeys.list(params),
    queryFn: ({ signal }) => listSpaces(params, signal),
  });
}
