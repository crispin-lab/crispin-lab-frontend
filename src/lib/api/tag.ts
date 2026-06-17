import { apiFetch } from "./client";
import type { PopularTagListResult } from "./types";

export type PopularTagsParams = {
  page?: number;
  size?: number;
};

export function fetchPopularTags(
  params: PopularTagsParams = {},
  signal?: AbortSignal,
): Promise<PopularTagListResult> {
  const search = buildPopularTagsQuery(params);
  const path = search === "" ? "/api/v1/tags/popular" : `/api/v1/tags/popular?${search}`;
  return apiFetch<PopularTagListResult>(path, { signal });
}

export function buildPopularTagsQuery(params: PopularTagsParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.append("page", String(params.page));
  if (params.size !== undefined) search.append("size", String(params.size));
  return search.toString();
}
