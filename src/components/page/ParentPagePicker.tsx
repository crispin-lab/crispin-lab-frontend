"use client";

import { X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageList } from "@/hooks/usePage";
import { toUserMessage } from "@/lib/api/errors";
import { type PageId, type SpaceId } from "@/lib/api/ids";
import type { PageSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 150;
const RESULT_SIZE = 20;

export type ParentPagePickerValue = Pick<PageSummary, "pageId" | "title">;

type Props = {
  spaceId: SpaceId;
  value: ParentPagePickerValue | null;
  onChange: (next: ParentPagePickerValue | null) => void;
  disabled?: boolean;
  id?: string;
  /**
   * 후보에서 제외할 pageId. 페이지 이동 UX 에서 자기 자신·현재 부모를 미리 걸러
   * `PAGE_PARENT_CYCLE` / `PAGE_PARENT_UNCHANGED` 에러 회귀를 예방.
   * 자기 *자손* 은 검색 응답에 ancestors 가 없어 클라이언트에서 판정 불가 — BE 의 cycle 검증에 위임.
   */
  excludePageIds?: readonly PageId[];
};

export function ParentPagePicker({
  spaceId,
  value,
  onChange,
  disabled,
  id,
  excludePageIds,
}: Props) {
  // 같은 페이지에 두 picker 인스턴스가 렌더돼도 aria-controls / aria-activedescendant 가 충돌하지 않게.
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // 빈 검색어는 첫 진입 fetch 응답성 차원에서 debounce 우회 — 입력 사이 throttling 의도가 없는 케이스다.
    const trimmed = rawQuery.trim();
    const delay = trimmed === "" ? 0 : SEARCH_DEBOUNCE_MS;
    const handle = window.setTimeout(() => setQuery(trimmed), delay);
    return () => window.clearTimeout(handle);
  }, [rawQuery]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setRawQuery("");
      setQuery("");
      setActiveIndex(0);
    }
  }

  const search = usePageList(
    { spaceId, query: query === "" ? undefined : query, sort: "TREE", size: RESULT_SIZE },
    // typeahead 검색은 직전 결과를 잔상으로 두지 않는다 — list page 의 keepPreviousData 기본을 picker 한정으로 override.
    { enabled: open, placeholderData: undefined },
  );

  const items = useMemo<ReadonlyArray<PageSummary>>(() => {
    const raw = search.data?.items ?? [];
    if (excludePageIds === undefined || excludePageIds.length === 0) return raw;
    const excluded = new Set<string>(excludePageIds);
    return raw.filter((item) => !excluded.has(item.pageId));
  }, [search.data, excludePageIds]);

  // 새 검색 결과가 도착하면 cursor 를 맨 위로. React docs 의 "previous value 비교 후 render 중 reset" 패턴.
  const [lastItems, setLastItems] = useState(items);
  if (lastItems !== items) {
    setLastItems(items);
    setActiveIndex(0);
  }
  const clampedActiveIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  function choose(next: ParentPagePickerValue | null) {
    onChange(next);
    handleOpenChange(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + items.length - 1) % items.length);
      return;
    }
    if (event.key === "Enter") {
      // form submit 으로 새는 걸 막기 위해 항상 preventDefault. composition 중이면 선택까지는 보류.
      event.preventDefault();
      if (event.nativeEvent.isComposing) return;
      const target = items[clampedActiveIndex];
      if (target !== undefined) choose({ pageId: target.pageId, title: target.title });
    }
  }

  const triggerLabel = value !== null ? value.title : "선택 안 함 (루트)";
  const activeOptionId =
    items.length > 0 ? `${listboxId}-option-${items[clampedActiveIndex].pageId}` : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            aria-label="부모 페이지 선택"
            aria-haspopup="listbox"
            aria-expanded={open}
            className="w-full justify-start"
          >
            <span className={cn("truncate", value === null && "text-muted-foreground")}>
              {triggerLabel}
            </span>
          </Button>
        }
      />
      <PopoverContent className="flex w-80 flex-col gap-2">
        <Input
          autoFocus
          placeholder="페이지 검색"
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="부모 페이지 검색"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={items.length > 0 ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
        />

        {value !== null && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="hover:bg-muted/50 focus-visible:bg-muted/50 text-muted-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-xs outline-none"
          >
            <X aria-hidden className="size-3" />
            선택 해제 (루트로)
          </button>
        )}

        {search.isPending ? (
          <div aria-busy="true" className="space-y-1.5 py-1">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-5/6" />
            <Skeleton className="h-7 w-2/3" />
          </div>
        ) : search.isError ? (
          <p role="alert" className="text-destructive px-2 py-1.5 text-xs">
            {toUserMessage(search.error)}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">일치하는 페이지가 없습니다.</p>
        ) : (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="부모 페이지 검색 결과"
            className="flex max-h-56 flex-col overflow-y-auto"
          >
            {items.map((item, index) => (
              <li
                key={item.pageId}
                id={`${listboxId}-option-${item.pageId}`}
                role="option"
                aria-selected={index === clampedActiveIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  // input 포커스 유지 + Popover 의 outside-click 닫힘 회피.
                  event.preventDefault();
                  choose({ pageId: item.pageId, title: item.title });
                }}
                className={cn(
                  "cursor-pointer truncate rounded-md px-2 py-1.5 text-sm",
                  index === clampedActiveIndex && "bg-accent text-accent-foreground",
                )}
              >
                {item.title}
              </li>
            ))}
          </ul>
        )}

        {search.data?.hasNext === true && (
          <p className="text-muted-foreground border-border border-t pt-1.5 text-xs">
            결과가 많아 일부만 표시됩니다. 검색어를 좁혀 주세요.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
