import { asSpaceId, type SpaceId } from "@/lib/api/ids";

export type SearchSort = "RELEVANCE" | "CREATED_AT" | "UPDATED_AT";

// PageSort 의 "TREE" 는 검색 맥락 외 — 의도적 제외.
export type SearchUrlParams = {
  query?: string;
  spaceId?: SpaceId;
  tag?: string[];
  sort?: SearchSort;
  page?: number;
  size?: number;
};

// SearchFilters 와 SearchResultList 가 같은 size 로 TanStack Query cache 를 공유해야 결과 행의
// 스페이스명 누락이 비결정적으로 나지 않는다. 한도 초과 시 별도 검색 endpoint (별도 티켓).
export const SPACE_LIST_SIZE = 100;

export function isSearchSort(value: string): value is SearchSort {
  return value === "RELEVANCE" || value === "UPDATED_AT" || value === "CREATED_AT";
}

type SearchParamsLike = Pick<URLSearchParams, "get" | "getAll">;

const MIN_SIZE = 1;
const MAX_SIZE = 100;

export function parseSearchParams(raw: SearchParamsLike): SearchUrlParams {
  const result: SearchUrlParams = {};

  const query = raw.get("query")?.trim();
  if (query !== undefined && query !== "") result.query = query;

  const space = raw.get("space");
  if (space !== null && space !== "") result.spaceId = asSpaceId(space);

  const tags = raw.getAll("tag").filter((value) => value !== "");
  if (tags.length > 0) result.tag = tags;

  const sort = raw.get("sort");
  if (sort !== null && isSearchSort(sort)) result.sort = sort;

  const pageRaw = raw.get("page");
  if (pageRaw !== null) {
    const page = Number(pageRaw);
    if (Number.isInteger(page) && page >= 0) result.page = page;
  }

  const sizeRaw = raw.get("size");
  if (sizeRaw !== null) {
    const size = Number(sizeRaw);
    if (Number.isInteger(size) && size >= MIN_SIZE && size <= MAX_SIZE) result.size = size;
  }

  return result;
}

// 이 키들이 바뀌면 page 는 리셋 — 결과량 변동으로 직전 page 가 OOB 되는 회귀 방지.
const PAGE_RESET_KEYS: ReadonlyArray<keyof SearchUrlParams> = [
  "query",
  "spaceId",
  "tag",
  "sort",
  "size",
];

export function buildSearchUrl(current: SearchUrlParams, patch: Partial<SearchUrlParams>): string {
  const next: SearchUrlParams = { ...current, ...patch };
  const resetsPage = PAGE_RESET_KEYS.some((k) => k in patch);
  if (resetsPage && !("page" in patch)) next.page = undefined;

  const search = new URLSearchParams();
  if (next.query !== undefined) search.set("query", next.query);
  if (next.spaceId !== undefined) search.set("space", next.spaceId);
  if (next.tag !== undefined) {
    for (const value of next.tag) search.append("tag", value);
  }
  if (next.sort !== undefined) search.set("sort", next.sort);
  if (next.page !== undefined) search.set("page", String(next.page));
  if (next.size !== undefined) search.set("size", String(next.size));

  const serialized = search.toString();
  return serialized === "" ? "/search" : `/search?${serialized}`;
}
