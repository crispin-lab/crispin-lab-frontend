"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpaceList } from "@/hooks/useSpace";
import { asSpaceId } from "@/lib/api/ids";
import { buildSearchUrl, type SearchSort, type SearchUrlParams } from "@/lib/search/searchParams";
import { cn } from "@/lib/utils";

type Props = {
  current: SearchUrlParams;
  className?: string;
};

const ALL_SPACES = "__all__";
// 스페이스 dropdown 은 옵션이 전체를 덮는 게 기대치. 한도 초과 시 별도 검색 endpoint (별도 티켓).
const SPACE_LIST_SIZE = 100;

const SORT_LABELS: Record<SearchSort, string> = {
  RELEVANCE: "관련도순",
  UPDATED_AT: "최신순",
  CREATED_AT: "오래된 순",
};
const SORT_ORDER: ReadonlyArray<SearchSort> = ["UPDATED_AT", "RELEVANCE", "CREATED_AT"];
const DEFAULT_SORT: SearchSort = "UPDATED_AT";

export function SearchFilters({ current, className }: Props) {
  const router = useRouter();
  const spaceListQuery = useSpaceList({ size: SPACE_LIST_SIZE });

  function handleSpaceChange(next: string | null) {
    if (typeof next !== "string") return;
    const patch = next === ALL_SPACES ? { spaceId: undefined } : { spaceId: asSpaceId(next) };
    router.push(buildSearchUrl(current, patch));
  }

  function handleSortChange(next: string | null) {
    if (typeof next !== "string") return;
    if (!isSearchSort(next)) return;
    router.push(buildSearchUrl(current, { sort: next }));
  }

  const spaceValue = current.spaceId ?? ALL_SPACES;
  const sortValue = current.sort ?? DEFAULT_SORT;
  const spaceLabel = resolveSpaceLabel(current.spaceId, spaceListQuery);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="검색 필터"
    >
      <Select
        value={spaceValue}
        onValueChange={handleSpaceChange}
        disabled={spaceListQuery.isPending}
      >
        <SelectTrigger aria-label="스페이스 필터" className="min-w-36">
          <SelectValue>{spaceLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SPACES}>전체 스페이스</SelectItem>
          {spaceListQuery.data?.items.map((space) => (
            <SelectItem key={space.spaceId} value={space.spaceId}>
              {space.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortValue} onValueChange={handleSortChange}>
        <SelectTrigger aria-label="정렬" className="min-w-32">
          <SelectValue>{SORT_LABELS[sortValue]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_ORDER.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function isSearchSort(value: string): value is SearchSort {
  return value === "RELEVANCE" || value === "UPDATED_AT" || value === "CREATED_AT";
}

function resolveSpaceLabel(
  spaceId: SearchUrlParams["spaceId"],
  spaceListQuery: ReturnType<typeof useSpaceList>,
): string {
  if (spaceId === undefined) return "전체 스페이스";
  if (spaceListQuery.isPending) return "스페이스 불러오는 중";
  const match = spaceListQuery.data?.items.find((space) => space.spaceId === spaceId);
  if (match !== undefined) return match.name;
  return "선택된 스페이스";
}
