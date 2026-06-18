import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import { fetchPopularTags, type PopularTagsParams } from "../tag";
import type { PopularTagListResult } from "../types";

export const tagKeys = {
  all: ["tag"] as const,
  populars: () => [...tagKeys.all, "popular"] as const,
  popular: (params: PopularTagsParams) => [...tagKeys.populars(), params] as const,
};

export function popularTagsOptions(params: PopularTagsParams = {}) {
  return queryOptions<PopularTagListResult, ApiError>({
    queryKey: tagKeys.popular(params),
    queryFn: ({ signal }) => fetchPopularTags(params, signal),
  });
}
