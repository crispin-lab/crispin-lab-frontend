import type { SpaceListParams } from "@/lib/api/space";
import type { SortDirection, SpaceSortKey } from "@/lib/api/types";

export const SPACE_LIST_PAGE_SIZE = 20;

export const SPACE_SORT_OPTIONS: ReadonlyArray<{ key: SpaceSortKey; label: string }> = [
  { key: "LAST_ACTIVITY_AT", label: "최근 활동순" },
  { key: "NAME", label: "이름순" },
  { key: "CREATED_AT", label: "생성일순" },
] as const;

// BE default 와 동일. 프론트도 default 를 알아야 "현재 정렬 badge active" 판단이 가능.
export const DEFAULT_SPACE_SORT: SpaceSortKey = "LAST_ACTIVITY_AT";

export function isSpaceSortKey(value: string): value is SpaceSortKey {
  return value === "LAST_ACTIVITY_AT" || value === "CREATED_AT" || value === "NAME";
}

function isSortDirection(value: string): value is SortDirection {
  return value === "ASC" || value === "DESC";
}

type SearchParamsLike = Pick<URLSearchParams, "get">;

export function parseSpaceListSearchParams(raw: SearchParamsLike): SpaceListParams {
  const result: SpaceListParams = {};

  const keyword = raw.get("keyword")?.trim();
  if (keyword !== undefined && keyword !== "") result.keyword = keyword;

  const sort = raw.get("sort");
  if (sort !== null && isSpaceSortKey(sort)) result.sort = sort;

  const direction = raw.get("direction");
  if (direction !== null && isSortDirection(direction)) result.direction = direction;

  const pageRaw = raw.get("page");
  if (pageRaw !== null) {
    const page = Number(pageRaw);
    if (Number.isInteger(page) && page >= 0) result.page = page;
  }

  return result;
}

// 이 키들이 바뀌면 page 리셋 — 결과량 변동으로 직전 page 가 OOB 되는 회귀 방지.
const PAGE_RESET_KEYS: ReadonlyArray<keyof SpaceListParams> = ["keyword", "sort", "direction"];

// 정렬 변경 시 URL patch — draft (편집 중 keyword) 가 URL 값과 다르면 keyword 도 함께 반영.
// 사용자가 keyword 입력 debounce 창 안에 정렬을 바꾸면 "이 keyword 로 이 정렬" 인 combined intent 를 잃지 않게.
export function buildSortChangePatch(
  currentKeyword: string,
  draft: string,
  sort: SpaceSortKey,
): Partial<SpaceListParams> {
  if (draft === currentKeyword) return { sort };
  return { sort, keyword: draft };
}

export function buildSpacesUrl(current: SpaceListParams, patch: Partial<SpaceListParams>): string {
  const next: SpaceListParams = { ...current, ...patch };
  const resetsPage = PAGE_RESET_KEYS.some((k) => k in patch);
  if (resetsPage && !("page" in patch)) next.page = undefined;

  const search = new URLSearchParams();
  if (next.keyword !== undefined) {
    const trimmed = next.keyword.trim();
    if (trimmed !== "") search.set("keyword", trimmed);
  }
  if (next.sort !== undefined) search.set("sort", next.sort);
  if (next.direction !== undefined) search.set("direction", next.direction);
  if (next.page !== undefined) search.set("page", String(next.page));

  const serialized = search.toString();
  return serialized === "" ? "/spaces" : `/spaces?${serialized}`;
}
