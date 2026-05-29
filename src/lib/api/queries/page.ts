import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { PageId } from "../ids";
import { fetchPage, type PageSearchParams, searchPages } from "../page";
import type { Page, PageSearchResult } from "../types";

// list key 는 stable-hash 비교 — `undefined` 필드와 미정의 필드가 같은 key 로 매칭되므로 PageSearchParams 에
// 새 필드가 추가돼도 기존 호출 (그 필드 생략) 의 cache 는 유효.
export const pageKeys = {
  all: ["page"] as const,
  lists: () => [...pageKeys.all, "list"] as const,
  list: (params: PageSearchParams) => [...pageKeys.lists(), params] as const,
  details: () => [...pageKeys.all, "detail"] as const,
  detail: (pageId: PageId) => [...pageKeys.details(), pageId] as const,
};

export function pageDetailOptions(pageId: PageId) {
  return queryOptions<Page, ApiError>({
    queryKey: pageKeys.detail(pageId),
    queryFn: ({ signal }) => fetchPage(pageId, signal),
  });
}

export function pageListOptions(params: PageSearchParams) {
  return queryOptions<PageSearchResult, ApiError>({
    queryKey: pageKeys.list(params),
    queryFn: ({ signal }) => searchPages(params, signal),
  });
}
