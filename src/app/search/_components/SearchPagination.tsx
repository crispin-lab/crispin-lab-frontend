"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildSearchUrl, type SearchUrlParams } from "@/lib/search/searchParams";
import { cn } from "@/lib/utils";

type Props = {
  current: SearchUrlParams;
  page: number;
  totalPages: number;
  hasNext: boolean;
  className?: string;
};

type WindowEntry = number | "ellipsis-start" | "ellipsis-end";

const WINDOW_RADIUS = 2;

export function SearchPagination({ current, page, totalPages, hasNext, className }: Props) {
  if (totalPages <= 1) return null;

  const window = buildPageWindow(page, totalPages);
  const isFirst = page <= 0;
  const hrefFor = (nextPage: number) => buildSearchUrl(current, { page: nextPage });

  return (
    <nav
      aria-label="검색 결과 페이지"
      className={cn("flex items-center justify-center gap-1 pt-2", className)}
    >
      {isFirst ? (
        <Button variant="ghost" size="sm" disabled aria-label="이전 페이지">
          이전
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href={hrefFor(page - 1)} aria-label="이전 페이지">
              이전
            </Link>
          }
        />
      )}
      {window.map((entry) => {
        if (entry === "ellipsis-start" || entry === "ellipsis-end") {
          return (
            <span key={entry} aria-hidden className="text-muted-foreground px-1 text-sm">
              …
            </span>
          );
        }
        const isCurrent = entry === page;
        // 현재 페이지: disabled 면 focus 가 빠져 위치 인지가 어려워 aria-disabled + tabIndex=-1.
        if (isCurrent) {
          return (
            <Button
              key={entry}
              variant="default"
              size="sm"
              aria-current="page"
              aria-disabled
              aria-label={`현재 페이지, ${entry + 1}페이지`}
              tabIndex={-1}
            >
              {entry + 1}
            </Button>
          );
        }
        return (
          <Button
            key={entry}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link href={hrefFor(entry)} aria-label={`${entry + 1}페이지`}>
                {entry + 1}
              </Link>
            }
          />
        );
      })}
      {!hasNext ? (
        <Button variant="ghost" size="sm" disabled aria-label="다음 페이지">
          다음
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href={hrefFor(page + 1)} aria-label="다음 페이지">
              다음
            </Link>
          }
        />
      )}
    </nav>
  );
}

export function buildPageWindow(current: number, totalPages: number): ReadonlyArray<WindowEntry> {
  const window: WindowEntry[] = [];
  const start = Math.max(0, current - WINDOW_RADIUS);
  const end = Math.min(totalPages - 1, current + WINDOW_RADIUS);

  if (start > 0) {
    window.push(0);
    const hidden = start - 1;
    if (hidden === 1) window.push(1);
    else if (hidden >= 2) window.push("ellipsis-start");
  }
  for (let i = start; i <= end; i++) window.push(i);
  if (end < totalPages - 1) {
    const lastPage = totalPages - 1;
    const hidden = lastPage - end - 1;
    if (hidden === 1) window.push(lastPage - 1);
    else if (hidden >= 2) window.push("ellipsis-end");
    window.push(lastPage);
  }
  return window;
}
