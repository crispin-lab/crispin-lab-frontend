"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SpaceListParams } from "@/lib/api/space";
import { buildPageWindow } from "@/lib/pagination/pageWindow";
import { buildSpacesUrl } from "@/lib/space/listParams";
import { cn } from "@/lib/utils";

type Props = {
  current: SpaceListParams;
  page: number;
  totalPages: number;
  hasNext: boolean;
  className?: string;
};

export function SpacesPagination({ current, page, totalPages, hasNext, className }: Props) {
  if (totalPages <= 1) return null;

  const entries = buildPageWindow(page, totalPages);
  const isFirst = page <= 0;
  const hrefFor = (nextPage: number) => buildSpacesUrl(current, { page: nextPage });

  return (
    <nav
      aria-label="스페이스 목록 페이지"
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
      {entries.map((entry) => {
        if (entry === "ellipsis-start" || entry === "ellipsis-end") {
          return (
            <span key={entry} aria-hidden className="text-muted-foreground px-1 text-sm">
              …
            </span>
          );
        }
        const isCurrent = entry === page;
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
