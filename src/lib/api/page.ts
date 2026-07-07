import { apiFetch } from "./client";
import type { PageId, SpaceId } from "./ids";
import type {
  Page,
  PageCreateRequest,
  PageCreateResult,
  PageInboundLinkListResult,
  PageMoveRequest,
  PageReorderRequest,
  PageSearchResult,
  PageUpdateRequest,
  PageUpdateResult,
} from "./types";

export type PageSort = "CREATED_AT" | "UPDATED_AT" | "RELEVANCE" | "TREE";

export type PageSearchParams = {
  query?: string;
  spaceId?: SpaceId;
  tag?: string[];
  /** cross-space 같은 이름의 모든 태그 중 하나 이상 보유 (BE LAB-126). landing TagCloud chip 의 navigation 경로. */
  tagName?: string;
  /**
   * 직계 자녀 필터. `undefined` 는 필터 미적용, `null` 은 루트 페이지 (부모 없음) 만, `PageId` 는 해당 부모의 직계 자녀만.
   * BE 는 이 값을 `parentPageId=<id>` 또는 `onlyRoot=true` 로 상호 배타 매핑한다 (LAB-181).
   */
  parentPageId?: PageId | null;
  sort?: PageSort;
  page?: number;
  size?: number;
};

export type PageInboundLinkParams = {
  page?: number;
  size?: number;
};

// pagination UI 가 없어 사용자에게 보이는 상한 역할 — 무한 스크롤 정책이 정해지기 전엔 늘리지 않는다.
export const INBOUND_LIST_SIZE = 20;

export function fetchPage(pageId: PageId, signal?: AbortSignal): Promise<Page> {
  return apiFetch<Page>(`/api/v1/pages/${encodeURIComponent(pageId)}`, { signal });
}

export function fetchInboundLinks(
  pageId: PageId,
  params: PageInboundLinkParams = {},
  signal?: AbortSignal,
): Promise<PageInboundLinkListResult> {
  const qs = buildInboundLinksQuery(params);
  const path =
    qs === ""
      ? `/api/v1/pages/${encodeURIComponent(pageId)}/inbound`
      : `/api/v1/pages/${encodeURIComponent(pageId)}/inbound?${qs}`;
  return apiFetch<PageInboundLinkListResult>(path, { signal });
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

export function movePage(pageId: PageId, body: PageMoveRequest): Promise<void> {
  return apiFetch<void>(`/api/v1/pages/${encodeURIComponent(pageId)}/parent`, {
    method: "PUT",
    body,
  });
}

export function reorderPage(pageId: PageId, body: PageReorderRequest): Promise<void> {
  return apiFetch<void>(`/api/v1/pages/${encodeURIComponent(pageId)}/order`, {
    method: "PUT",
    body,
  });
}

export function buildInboundLinksQuery(params: PageInboundLinkParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
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
  if (params.tagName !== undefined && params.tagName !== "") {
    search.append("tagName", params.tagName);
  }
  if (params.parentPageId === null) {
    search.append("onlyRoot", "true");
  } else if (params.parentPageId !== undefined) {
    search.append("parentPageId", params.parentPageId);
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
