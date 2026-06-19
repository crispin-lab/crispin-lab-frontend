"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { TagChip } from "@/components/tag/TagChip";
import { Skeleton } from "@/components/ui/skeleton";
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
  // BE LAB-126 의 `/v1/pages?tagName=` 가 cross-space 같은 이름의 모든 tagId 보유 페이지를 묶어준다 — PopularTag 의
  // cross-space name 집계 정신과 정합. 빈 name 은 BE 가 "미매치 시 빈 결과" 라 시각적 의도 없는 link 라 떼고 display-only.
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((tag) => (
        <li key={tag.name}>
          {tag.name === "" ? (
            <TagChip
              name={tag.name}
              trailing={
                <span className="text-muted-foreground/70 text-[0.65rem]" aria-hidden>
                  {tag.usageCount}
                </span>
              }
            />
          ) : (
            <TagChip
              name={tag.name}
              href={`/search?tagName=${encodeURIComponent(tag.name)}`}
              trailing={
                <span className="text-muted-foreground/70 text-[0.65rem]" aria-hidden>
                  {tag.usageCount}
                </span>
              }
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function TagCloudSkeleton() {
  return (
    <ul role="status" aria-label="인기 태그 불러오는 중" className="flex flex-wrap gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i}>
          <Skeleton className="h-7 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
