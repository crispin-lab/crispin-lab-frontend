import { apiFetch } from "./client";
import type { PageId, TagId } from "./ids";
import { buildPaginationQuery } from "./pagination";
import type { PageTagAttachRequest, PageTagListResult } from "./types";

export type PageTagListParams = {
  page?: number;
  size?: number;
};

export function fetchPageTagList(
  pageId: PageId,
  params: PageTagListParams = {},
  signal?: AbortSignal,
): Promise<PageTagListResult> {
  const search = buildPaginationQuery(params);
  const base = `/api/v1/pages/${encodeURIComponent(pageId)}/tags`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetch<PageTagListResult>(path, { signal });
}

export function attachPageTag(pageId: PageId, body: PageTagAttachRequest): Promise<void> {
  return apiFetch<void>(`/api/v1/pages/${encodeURIComponent(pageId)}/tags`, {
    method: "POST",
    body,
  });
}

export function detachPageTag(pageId: PageId, tagId: TagId): Promise<void> {
  return apiFetch<void>(
    `/api/v1/pages/${encodeURIComponent(pageId)}/tags/${encodeURIComponent(tagId)}`,
    { method: "DELETE" },
  );
}
