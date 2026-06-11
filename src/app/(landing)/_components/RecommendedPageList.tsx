"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { toUserMessage } from "@/lib/api/errors";
import { pageListOptions } from "@/lib/api/queries/page";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { RECOMMENDED_PARAMS } from "./recommended";

type Props = {
  className?: string;
};

export function RecommendedPageList({ className }: Props) {
  const headingId = useId();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(
    pageListOptions(RECOMMENDED_PARAMS),
  );

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isPending}
      className={cn("flex flex-col gap-4", className)}
    >
      <h2 id={headingId} className="text-lg font-semibold">
        최근 공개 페이지
      </h2>
      <RecommendedListBody
        data={data}
        isPending={isPending}
        isError={isError}
        error={error}
        refetch={refetch}
        isFetching={isFetching}
      />
    </section>
  );
}

type BodyProps = {
  data: PageSearchResult | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  isFetching: boolean;
};

function RecommendedListBody({ data, isPending, isError, error, refetch, isFetching }: BodyProps) {
  if (isPending) return <RecommendedListSkeleton />;
  if (isError) {
    return (
      <ErrorRetryCard
        message={toUserMessage(error)}
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }
  if (data === undefined || data.items.length === 0) {
    return <p className="text-muted-foreground text-sm">아직 공개된 페이지가 없습니다.</p>;
  }
  return (
    <ul className="divide-border divide-y border-y">
      {data.items.map((page) => (
        <li key={page.pageId}>
          <RecommendedPageRow page={page} />
        </li>
      ))}
    </ul>
  );
}

function RecommendedPageRow({ page }: { page: PageSummary }) {
  return (
    <Link
      href={`/pages/${encodeURIComponent(page.pageId)}`}
      className="hover:bg-muted/40 hover:shadow-accent-glow focus-visible:ring-ring flex items-center justify-between gap-4 rounded-md px-2 py-3 text-sm transition-shadow duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="truncate">{page.title}</span>
      <time dateTime={page.updatedAt} className="text-muted-foreground shrink-0 text-xs">
        {formatUpdatedAtKR(page.updatedAt)}
      </time>
    </Link>
  );
}

function RecommendedListSkeleton() {
  return (
    <ul
      role="status"
      aria-label="추천 페이지 불러오는 중"
      className="divide-border divide-y border-y"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-2 py-3">
          <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          <div className="bg-muted h-3 w-16 animate-pulse rounded" />
        </li>
      ))}
    </ul>
  );
}
