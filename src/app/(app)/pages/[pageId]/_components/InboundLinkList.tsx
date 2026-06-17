"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { useSpaceList } from "@/hooks/useSpace";
import { usePageInboundLinks } from "@/hooks/usePageInboundLinks";
import { toUserMessage } from "@/lib/api/errors";
import type { PageId } from "@/lib/api/ids";
import { INBOUND_LIST_SIZE } from "@/lib/api/page";
import type { PageInboundLink } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";
import { SPACE_LIST_SIZE } from "@/lib/search/searchParams";

type Props = {
  pageId: PageId;
  className?: string;
};

export function InboundLinkList({ pageId, className }: Props) {
  const query = usePageInboundLinks(pageId, { size: INBOUND_LIST_SIZE });
  const spaceListQuery = useSpaceList({ size: SPACE_LIST_SIZE });
  const spaceNameById = useMemo(
    () => new Map(spaceListQuery.data?.items.map((space) => [space.spaceId, space.name]) ?? []),
    [spaceListQuery.data],
  );

  // spaceList 가 pending 인 동안 row 가 spaceName 없이 그려졌다가 채워지는 flash 회피.
  if (query.isPending || spaceListQuery.isPending) {
    return <InboundLinkListSkeleton className={className} />;
  }

  if (query.isError) {
    return (
      <section className={className}>
        <SectionHeading />
        <ErrorRetryCard
          message={toUserMessage(query.error)}
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
          className="mt-3"
        />
      </section>
    );
  }

  // 빈 결과면 섹션 자체 미노출 — 위키 reading 환경의 시각 노이즈 최소화.
  if (query.data.items.length === 0) {
    return null;
  }

  return (
    <section className={className} aria-labelledby="inbound-link-heading">
      <SectionHeading />
      <ul aria-label="이 페이지로 들어오는 링크" className="divide-border mt-3 divide-y border-y">
        {query.data.items.map((source) => (
          <li key={source.pageId}>
            <InboundLinkRow source={source} spaceName={spaceNameById.get(source.spaceId) ?? null} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHeading() {
  return (
    <h2 id="inbound-link-heading" className="text-xl font-semibold">
      이 페이지로 들어오는 링크
    </h2>
  );
}

function InboundLinkRow({
  source,
  spaceName,
}: {
  source: PageInboundLink;
  spaceName: string | null;
}) {
  return (
    <Link
      href={`/pages/${encodeURIComponent(source.pageId)}`}
      className="hover:bg-muted/40 hover:shadow-accent-glow focus-visible:ring-ring flex flex-col gap-1 rounded-md px-2 py-3 transition-shadow duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="truncate text-sm font-medium">{source.title}</span>
      <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {spaceName !== null && (
          <>
            <span className="truncate">{spaceName}</span>
            <span aria-hidden>·</span>
          </>
        )}
        {source.authorHandle === "" ? (
          <span className="italic">삭제된 사용자</span>
        ) : (
          <span className="text-accent-secondary">@{source.authorHandle}</span>
        )}
        <span aria-hidden>·</span>
        <time dateTime={source.updatedAt}>{formatUpdatedAtKR(source.updatedAt)}</time>
      </span>
    </Link>
  );
}

function InboundLinkListSkeleton({ className }: { className?: string }) {
  return (
    <section className={className}>
      <SectionHeading />
      <ul
        role="status"
        aria-label="인바운드 링크 불러오는 중"
        className="divide-border mt-3 divide-y border-y"
      >
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex flex-col gap-2 px-2 py-3">
            <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
            <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
          </li>
        ))}
      </ul>
    </section>
  );
}
