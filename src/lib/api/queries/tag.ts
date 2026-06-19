import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { SpaceId } from "../ids";
import {
  fetchPopularTags,
  fetchSpaceTagList,
  type PopularTagsParams,
  type SpaceTagListParams,
} from "../tag";
import type { PopularTagListResult, TagListResult } from "../types";

export const tagKeys = {
  all: ["tag"] as const,
  populars: () => [...tagKeys.all, "popular"] as const,
  popular: (params: PopularTagsParams) => [...tagKeys.populars(), params] as const,
  spaceLists: () => [...tagKeys.all, "space"] as const,
  spaceList: (spaceId: SpaceId, params: SpaceTagListParams) =>
    [...tagKeys.spaceLists(), spaceId, params] as const,
};

export function popularTagsOptions(params: PopularTagsParams = {}) {
  return queryOptions<PopularTagListResult, ApiError>({
    queryKey: tagKeys.popular(params),
    queryFn: ({ signal }) => fetchPopularTags(params, signal),
  });
}

export function spaceTagListOptions(spaceId: SpaceId, params: SpaceTagListParams = {}) {
  return queryOptions<TagListResult, ApiError>({
    queryKey: tagKeys.spaceList(spaceId, params),
    queryFn: ({ signal }) => fetchSpaceTagList(spaceId, params, signal),
  });
}
