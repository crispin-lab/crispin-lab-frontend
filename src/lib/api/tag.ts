import { apiFetch } from "./client";
import type { SpaceId } from "./ids";
import { buildPaginationQuery } from "./pagination";
import type {
  PopularTagListResult,
  TagListResult,
  TagRegisterRequest,
  TagRegisterResult,
} from "./types";

export type PopularTagsParams = {
  page?: number;
  size?: number;
};

export type SpaceTagListParams = {
  page?: number;
  size?: number;
};

export function fetchPopularTags(
  params: PopularTagsParams = {},
  signal?: AbortSignal,
): Promise<PopularTagListResult> {
  const search = buildPaginationQuery(params);
  const path = search === "" ? "/api/v1/tags/popular" : `/api/v1/tags/popular?${search}`;
  return apiFetch<PopularTagListResult>(path, { signal });
}

export function fetchSpaceTagList(
  spaceId: SpaceId,
  params: SpaceTagListParams = {},
  signal?: AbortSignal,
): Promise<TagListResult> {
  const search = buildPaginationQuery(params);
  const base = `/api/v1/spaces/${encodeURIComponent(spaceId)}/tags`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetch<TagListResult>(path, { signal });
}

export function registerTag(body: TagRegisterRequest): Promise<TagRegisterResult> {
  return apiFetch<TagRegisterResult>("/api/v1/tags", {
    method: "POST",
    body,
  });
}
