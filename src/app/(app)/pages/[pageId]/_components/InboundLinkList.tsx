"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { usePageInboundLinks } from "@/hooks/usePageInboundLinks";
import { useSpaceList } from "@/hooks/useSpace";
import { toUserMessage } from "@/lib/api/errors";
import type { PageId } from "@/lib/api/ids";
import { INBOUND_LIST_SIZE } from "@/lib/api/page";
import type { PageInboundLink } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";
import { SPACE_LIST_SIZE } from "@/lib/search/searchParams";
import { cn } from "@/lib/utils";

type Props = {
  pageId: PageId;
  // /v1/spaces 는 인증 endpoint — 비로그인 진입에서 호출하면 401 → 글로벌 redirect 로 공개 reading 흐름이 깨진다.
  // 게이트가 false 면 spaceName 없이 row 만 노출.
  isAuthenticated: boolean;
  className?: string;
};

export function InboundLinkList({ pageId, isAuthenticated, className }: Props) {
  const query = usePageInboundLinks(pageId, { size: INBOUND_LIST_SIZE });
  const spaceListQuery = useSpaceList({ size: SPACE_LIST_SIZE }, { enabled: isAuthenticated });
  // spaceList 가 에러/disabled 면 빈 Map → row 는 spaceName 없이 그대로 노출 (graceful degradation).
  // 인바운드 본 정보 (title / author / 날짜) 는 영향 없어 섹션 전체를 error 로 떨어뜨리지 않는다.
  const spaceNameById = useMemo(
    () => new Map(spaceListQuery.data?.items.map((space) => [space.spaceId, space.name]) ?? []),
    [spaceListQuery.data],
  );

  // isLoading 은 actively-fetching 만 true — disabled (비로그인) 과 error 는 둘 다 success path 로 자연히 떨어진다.
  if (query.isLoading || spaceListQuery.isLoading) {
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
  if (!query.data || query.data.items.length === 0) {
    return null;
  }

  return (
    <section className={className} aria-labelledby="inbound-link-heading">
      <SectionHeading />
      <ul className="divide-border mt-3 divide-y border-y">
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

// skeleton 에는 heading 을 두지 않는다 — 빈 결과면 섹션 자체가 사라지므로 heading 이 잠깐 보였다 사라지는 flash 를 막는다.
function InboundLinkListSkeleton({ className }: { className?: string }) {
  return (
    <ul
      role="status"
      aria-label="인바운드 링크 불러오는 중"
      className={cn("divide-border divide-y border-y", className)}
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex flex-col gap-2 px-2 py-3">
          <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
        </li>
      ))}
    </ul>
  );
}
