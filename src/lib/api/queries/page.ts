import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { PageId } from "../ids";
import {
  fetchInboundLinks,
  fetchPage,
  type PageInboundLinkParams,
  type PageSearchParams,
  searchPages,
} from "../page";
import type { Page, PageInboundLinkListResult, PageSearchResult } from "../types";

// list key 는 stable-hash 비교 — `undefined` 필드와 미정의 필드가 같은 key 로 매칭되므로 PageSearchParams 에
// 새 필드가 추가돼도 기존 호출 (그 필드 생략) 의 cache 는 유효.
export const pageKeys = {
  all: ["page"] as const,
  lists: () => [...pageKeys.all, "list"] as const,
  list: (params: PageSearchParams) => [...pageKeys.lists(), params] as const,
  details: () => [...pageKeys.all, "detail"] as const,
  detail: (pageId: PageId) => [...pageKeys.details(), pageId] as const,
  inbounds: () => [...pageKeys.all, "inbound"] as const,
  inbound: (pageId: PageId, params: PageInboundLinkParams = {}) =>
    [...pageKeys.inbounds(), pageId, params] as const,
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
    // 페이지·필터 전환 중 직전 결과 유지 — layout shift 와 pagination 사라짐 방지.
    placeholderData: keepPreviousData,
  });
}

export function pageInboundLinksOptions(pageId: PageId, params: PageInboundLinkParams = {}) {
  return queryOptions<PageInboundLinkListResult, ApiError>({
    queryKey: pageKeys.inbound(pageId, params),
    queryFn: ({ signal }) => fetchInboundLinks(pageId, params, signal),
    // 인바운드 그래프는 자주 보지만 자주 변하지 않음 — api-client.md staleTime 표 정합.
    staleTime: 30_000,
  });
}
