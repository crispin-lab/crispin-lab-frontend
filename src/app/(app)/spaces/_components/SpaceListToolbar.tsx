"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { SearchInput } from "@/components/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpaceListParams } from "@/lib/api/space";
import {
  buildSortChangePatch,
  buildSpacesUrl,
  DEFAULT_SPACE_SORT,
  isSpaceSortKey,
  SPACE_SORT_OPTIONS,
} from "@/lib/space/listParams";
import { cn } from "@/lib/utils";

type Props = {
  current: SpaceListParams;
  totalElements: number | undefined;
  className?: string;
};

const KEYWORD_DEBOUNCE_MS = 300;

export function SpaceListToolbar({ current, totalElements, className }: Props) {
  const router = useRouter();
  const urlKeyword = current.keyword ?? "";
  const [draft, setDraft] = useState(urlKeyword);
  // urlKeyword 가 외부에서 바뀌면 (뒤로가기 · hydrate) draft 를 그 값으로 리셋. React 공식 "Adjusting state
  // while rendering" 패턴 — useEffect 를 쓰지 않아 cascading render 회피.
  const [lastUrlKeyword, setLastUrlKeyword] = useState(urlKeyword);
  if (lastUrlKeyword !== urlKeyword) {
    setLastUrlKeyword(urlKeyword);
    setDraft(urlKeyword);
  }

  // Timer 콜백 · handleSortChange 가 최신 current 를 참조하도록 ref 로 보관. closure 로 잡으면 정렬 · 뒤로가기로
  // URL 이 바뀐 뒤 debounce 가 발화할 때 stale current 로 push 해 방금 변경한 상태가 덮인다.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const debounceTimer = useRef<number | null>(null);

  function cancelDebounce() {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }

  useEffect(() => cancelDebounce, []);

  function handleKeywordInput(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDraft(next);
    cancelDebounce();
    debounceTimer.current = window.setTimeout(() => {
      router.push(buildSpacesUrl(currentRef.current, { keyword: next }));
    }, KEYWORD_DEBOUNCE_MS);
  }

  function handleSortChange(next: string | null) {
    if (typeof next !== "string" || !isSpaceSortKey(next)) return;
    cancelDebounce();
    const patch = buildSortChangePatch(currentRef.current.keyword ?? "", draft, next);
    router.push(buildSpacesUrl(currentRef.current, patch));
  }

  const sortValue = current.sort ?? DEFAULT_SPACE_SORT;
  const isSortActive = current.sort !== undefined && current.sort !== DEFAULT_SPACE_SORT;
  const sortLabel = SPACE_SORT_OPTIONS.find((option) => option.key === sortValue)?.label ?? "정렬";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-3", className)}
      role="group"
      aria-label="스페이스 목록 도구"
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="space-list-keyword" className="sr-only">
          스페이스 이름 검색
        </label>
        <SearchInput
          id="space-list-keyword"
          value={draft}
          onChange={handleKeywordInput}
          placeholder="스페이스 이름 검색"
          autoComplete="off"
        />
      </div>

      <Select value={sortValue} onValueChange={handleSortChange}>
        <SelectTrigger
          aria-label="정렬"
          className={cn("min-w-36", isSortActive && "border-accent")}
        >
          <SelectValue>{sortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SPACE_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* label 은 sr-only 텍스트 — aria-label 을 쓰면 label 이 accessible name 을 override 해 aria-live 로 실제
          카운트가 안 읽힌다. */}
      <p role="status" className="text-muted-foreground min-w-16 text-xs whitespace-nowrap">
        <span className="sr-only">총 스페이스 수: </span>
        {totalElements === undefined ? "…" : `총 ${totalElements}개`}
      </p>
    </div>
  );
}
