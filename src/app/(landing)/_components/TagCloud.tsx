"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { toUserMessage } from "@/lib/api/errors";
import { popularTagsOptions } from "@/lib/api/queries/tag";
import type { PopularTag } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { POPULAR_TAGS_PARAMS } from "./tags";

type Props = {
  className?: string;
};

export function TagCloud({ className }: Props) {
  const headingId = useId();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(
    popularTagsOptions(POPULAR_TAGS_PARAMS),
  );

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isPending}
      className={cn("flex flex-col gap-4", className)}
    >
      <h2 id={headingId} className="text-lg font-semibold">
        인기 태그
      </h2>
      <TagCloudBody
        items={data?.items}
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
  items: ReadonlyArray<PopularTag> | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  isFetching: boolean;
};

function TagCloudBody({ items, isPending, isError, error, refetch, isFetching }: BodyProps) {
  if (isPending) return <TagCloudSkeleton />;
  if (isError) {
    return (
      <ErrorRetryCard
        message={toUserMessage(error)}
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }
  if (items === undefined || items.length === 0) {
    return <p className="text-muted-foreground text-sm">아직 사용된 태그가 없습니다.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((tag) => (
        <li key={tag.name}>
          <Link
            href={`/search?tag=${encodeURIComponent(tag.name)}`}
            className="border-border bg-surface-elevated text-muted-foreground hover:text-foreground hover:shadow-accent-glow focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-shadow duration-200 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span>#{tag.name}</span>
            <span className="text-muted-foreground/70 text-[0.65rem]" aria-hidden>
              {tag.usageCount}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TagCloudSkeleton() {
  return (
    <ul role="status" aria-label="인기 태그 불러오는 중" className="flex flex-wrap gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="bg-muted h-7 w-20 animate-pulse rounded-full" />
      ))}
    </ul>
  );
}
