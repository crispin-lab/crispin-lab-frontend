"use client";

import { type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { useSpaceList } from "@/hooks/useSpace";
import { type ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { PageSearchResult } from "@/lib/api/types";
import { SPACE_LIST_SIZE } from "@/lib/search/searchParams";
import { cn } from "@/lib/utils";

import { SearchResultRow } from "./SearchResultRow";

type Props = {
  query: UseQueryResult<PageSearchResult, ApiError>;
  searchQuery: string | undefined;
  className?: string;
};

export function SearchResultList({ query, searchQuery, className }: Props) {
  const spaceListQuery = useSpaceList({ size: SPACE_LIST_SIZE });
  const spaceNameById = useMemo(
    () => new Map(spaceListQuery.data?.items.map((space) => [space.spaceId, space.name]) ?? []),
    [spaceListQuery.data],
  );

  if (query.isPending) return <SearchResultListSkeleton className={className} />;

  if (query.isError) {
    return (
      <ErrorRetryCard
        message={toUserMessage(query.error)}
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
        className={className}
      />
    );
  }

  if (query.data.items.length === 0) {
    return <EmptyMessage searchQuery={searchQuery} className={className} />;
  }

  return (
    <ul aria-label="검색 결과" className={cn("divide-border divide-y border-y", className)}>
      {query.data.items.map((page) => (
        <li key={page.pageId}>
          <SearchResultRow page={page} spaceName={spaceNameById.get(page.spaceId) ?? null} />
        </li>
      ))}
    </ul>
  );
}

function EmptyMessage({
  searchQuery,
  className,
}: {
  searchQuery: string | undefined;
  className?: string;
}) {
  if (searchQuery === undefined) {
    return (
      <p className={cn("text-muted-foreground py-10 text-center text-sm", className)}>
        검색 결과가 없습니다.
      </p>
    );
  }
  return (
    <p className={cn("text-muted-foreground py-10 text-center text-sm", className)}>
      &ldquo;{searchQuery}&rdquo; 에 대한 검색 결과가 없습니다. 다른 검색어를 시도해 보세요.
    </p>
  );
}

function SearchResultListSkeleton({ className }: { className?: string }) {
  return (
    <ul
      role="status"
      aria-label="검색 결과 불러오는 중"
      className={cn("divide-border divide-y border-y", className)}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex flex-col gap-2 px-2 py-3">
          <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
        </li>
      ))}
    </ul>
  );
}
