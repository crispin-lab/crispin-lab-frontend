import { apiFetch } from "./client";
import type { PageId, SpaceId } from "./ids";
import type {
  Page,
  PageCreateRequest,
  PageCreateResult,
  PageInboundLinkList,
  PageSearchResult,
  PageUpdateRequest,
  PageUpdateResult,
} from "./types";

export type PageSort = "CREATED_AT" | "UPDATED_AT" | "RELEVANCE" | "TREE";

export type PageSearchParams = {
  query?: string;
  spaceId?: SpaceId;
  tag?: string[];
  sort?: PageSort;
  page?: number;
  size?: number;
};

export type PageInboundLinkParams = {
  page?: number;
  size?: number;
};

export function fetchPage(pageId: PageId, signal?: AbortSignal): Promise<Page> {
  return apiFetch<Page>(`/api/v1/pages/${encodeURIComponent(pageId)}`, { signal });
}

export function fetchInboundLinks(
  pageId: PageId,
  params: PageInboundLinkParams = {},
  signal?: AbortSignal,
): Promise<PageInboundLinkList> {
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  const qs = search.toString();
  const path =
    qs === ""
      ? `/api/v1/pages/${encodeURIComponent(pageId)}/inbound`
      : `/api/v1/pages/${encodeURIComponent(pageId)}/inbound?${qs}`;
  return apiFetch<PageInboundLinkList>(path, { signal });
}

export function searchPages(
  params: PageSearchParams,
  signal?: AbortSignal,
): Promise<PageSearchResult> {
  const search = buildSearchPagesQuery(params);
  const path = search === "" ? "/api/v1/pages" : `/api/v1/pages?${search}`;
  return apiFetch<PageSearchResult>(path, { signal });
}

export function updatePage(pageId: PageId, body: PageUpdateRequest): Promise<PageUpdateResult> {
  return apiFetch<PageUpdateResult>(`/api/v1/pages/${encodeURIComponent(pageId)}`, {
    method: "PUT",
    body,
  });
}

export function createPage(body: PageCreateRequest): Promise<PageCreateResult> {
  return apiFetch<PageCreateResult>("/api/v1/pages", {
    method: "POST",
    body,
  });
}

export function deletePage(pageId: PageId): Promise<void> {
  return apiFetch<void>(`/api/v1/pages/${encodeURIComponent(pageId)}`, {
    method: "DELETE",
  });
}

export function buildSearchPagesQuery(params: PageSearchParams): string {
  const search = new URLSearchParams();
  if (params.query !== undefined && params.query !== "") {
    search.append("query", params.query);
  }
  if (params.spaceId !== undefined) {
    search.append("space", params.spaceId);
  }
  if (params.tag !== undefined) {
    for (const tagId of params.tag) {
      search.append("tag", tagId);
    }
  }
  if (params.sort !== undefined) {
    search.append("sort", params.sort);
  }
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
}
