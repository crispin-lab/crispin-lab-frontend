import { apiFetch } from "./client";
import type { SpaceId } from "./ids";
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

export function fetchSpaceTagList(
  spaceId: SpaceId,
  params: SpaceTagListParams = {},
  signal?: AbortSignal,
): Promise<TagListResult> {
  const search = buildSpaceTagListQuery(params);
  const base = `/api/v1/spaces/${encodeURIComponent(spaceId)}/tags`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetch<TagListResult>(path, { signal });
}

export function buildSpaceTagListQuery(params: SpaceTagListParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.append("page", String(params.page));
  if (params.size !== undefined) search.append("size", String(params.size));
  return search.toString();
}

export function registerTag(body: TagRegisterRequest): Promise<TagRegisterResult> {
  return apiFetch<TagRegisterResult>("/api/v1/tags", {
    method: "POST",
    body,
  });
}
