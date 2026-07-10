"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

  // Timer 콜백 · handleSortChange 가 최신 current 를 참조하도록 ref 로 보관. closure 로 잡으면 정렬 · 뒤로가기로
  // URL 이 바뀐 뒤 debounce 가 발화할 때 stale current 로 push 해 방금 변경한 상태가 덮인다.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const debounceTimer = useRef<number | null>(null);
  // 우리가 방금 commit 한 keyword — self-echo (router.replace / push 의 결과로 되돌아온 urlKeyword) 를 구분한다.
  // Self-echo 인데도 draft 를 리셋하면 그 사이 사용자가 이어서 친 입력을 잃는다.
  const lastCommittedKeywordRef = useRef<string | null>(null);

  function cancelDebounce() {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }

  // urlKeyword 가 외부에서 바뀌면 (뒤로가기 · hydrate) draft 를 그 값으로 리셋 + 진행 중이던 debounce timer 취소.
  // Timer 를 살려두면 방금 완료된 외부 navigation 을 stale draft 로 덮어쓰는 회귀.
  // useLayoutEffect 로 commit 직후 browser task 를 yield 하기 전에 clear (일반 useEffect 는 render 와 effect
  // 사이에 timer 가 발화할 여지가 남음). Self-echo (우리가 방금 commit 한 keyword) 는 draft 를 덮지 않는다 —
  // 사용자가 이어서 친 draft 를 잃지 않게, 새로 예약된 debounce 도 살려둔다.
  useLayoutEffect(() => {
    if (urlKeyword !== lastCommittedKeywordRef.current) {
      setDraft(urlKeyword);
      cancelDebounce();
    }
  }, [urlKeyword]);

  useEffect(() => cancelDebounce, []);

  function handleKeywordInput(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDraft(next);
    cancelDebounce();
    debounceTimer.current = window.setTimeout(() => {
      // debounced 키워드 커밋은 history 를 오염시키지 않도록 replace — 뒤로가기가 keyword 입력 이전 화면
      // (정렬 · 페이지 이동) 으로 바로 돌아가게 한다. push 는 정렬 · 페이지네이션 등 명시 액션에만.
      lastCommittedKeywordRef.current = next;
      router.replace(buildSpacesUrl(currentRef.current, { keyword: next }));
    }, KEYWORD_DEBOUNCE_MS);
  }

  function handleSortChange(next: string | null) {
    if (typeof next !== "string" || !isSpaceSortKey(next)) return;
    cancelDebounce();
    const patch = buildSortChangePatch(currentRef.current.keyword ?? "", draft, next);
    // sort 클릭이 draft 를 함께 push 하는 경우 self-echo 판별에 포함.
    if (patch.keyword !== undefined) lastCommittedKeywordRef.current = patch.keyword;
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
