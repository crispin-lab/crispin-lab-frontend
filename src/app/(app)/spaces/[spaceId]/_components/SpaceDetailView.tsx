"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { type UseQueryResult } from "@tanstack/react-query";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSpaceDetail } from "@/hooks/useSpace";
import { usePageList } from "@/hooks/usePage";
import { ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { SpaceId } from "@/lib/api/ids";
import type { PageSearchResult, Space } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";

type Props = {
  spaceId: SpaceId;
};

export function SpaceDetailView({ spaceId }: Props) {
  const spaceQuery = useSpaceDetail(spaceId, { refetchOnMount: "always" });
  const pageListQuery = usePageList({ spaceId }, { refetchOnMount: "always" });

  if (
    spaceQuery.isError &&
    spaceQuery.error instanceof ApiError &&
    (spaceQuery.error.status === 403 || spaceQuery.error.status === 404)
  ) {
    notFound();
  }

  const newPageHref = `/pages/new?spaceId=${encodeURIComponent(spaceId)}`;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <SpaceMetaSection query={spaceQuery} />
      <PageListSection query={pageListQuery} newPageHref={newPageHref} />
    </main>
  );
}

function SpaceMetaSection({ query }: { query: UseQueryResult<Space, ApiError> }) {
  if (query.isPending) {
    return <SpaceMetaSkeleton />;
  }
  if (query.isError) {
    return (
      <ErrorRetryCard
        message={toUserMessage(query.error)}
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const space = query.data;
  const description = space.description.trim();
  const updatedAtLabel = formatUpdatedAtKR(space.updatedAt);

  return (
    <header aria-labelledby="space-meta-heading" className="space-y-3">
      <h1
        id="space-meta-heading"
        className="bg-gradient-to-r from-(--heading-gradient-start) to-(--heading-gradient-end) bg-clip-text text-3xl font-semibold tracking-tight text-transparent"
      >
        {space.name}
      </h1>
      {description !== "" && <p className="text-muted-foreground leading-7">{description}</p>}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <VisibilityBadge visibility={space.visibility} />
        <time dateTime={space.updatedAt} aria-label={`마지막 수정 ${updatedAtLabel}`}>
          수정 {updatedAtLabel}
        </time>
      </div>
    </header>
  );
}

function PageListSection({
  query,
  newPageHref,
}: {
  query: UseQueryResult<PageSearchResult, ApiError>;
  newPageHref: string;
}) {
  const hasItems = query.data !== undefined && query.data.items.length > 0;
  const isEmpty = query.data !== undefined && query.data.items.length === 0;

  return (
    <section aria-labelledby="page-list-heading" className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h2 id="page-list-heading" className="text-2xl font-semibold">
          페이지
        </h2>
        {hasItems && (
          <Button nativeButton={false} render={<Link href={newPageHref}>새 페이지 만들기</Link>} />
        )}
      </header>

      {query.isPending && <PageListSkeleton />}

      {query.isError && (
        <ErrorRetryCard
          message={toUserMessage(query.error)}
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      )}

      {isEmpty && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm">아직 페이지가 없습니다.</p>
            <Button
              nativeButton={false}
              render={<Link href={newPageHref}>첫 페이지 만들기</Link>}
            />
          </CardContent>
        </Card>
      )}

      {hasItems && (
        <ul className="divide-border divide-y overflow-hidden rounded-lg border">
          {query.data.items.map((page) => {
            const updatedAtLabel = formatUpdatedAtKR(page.updatedAt);
            return (
              <li key={page.pageId}>
                <Link
                  href={`/pages/${page.pageId}`}
                  className="hover:bg-muted/60 hover:shadow-accent-glow focus-visible:bg-muted/60 block px-4 py-3 transition-shadow duration-200 ease-out focus-visible:outline-none"
                >
                  <p className="font-medium">{page.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    <time dateTime={page.updatedAt}>수정 {updatedAtLabel}</time>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SpaceMetaSkeleton() {
  return (
    <header aria-hidden="true" className="space-y-3">
      <div className="bg-muted h-8 w-1/3 animate-pulse rounded" />
      <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
      <div className="bg-muted h-4 w-1/4 animate-pulse rounded" />
    </header>
  );
}

function PageListSkeleton() {
  return (
    <ul aria-hidden="true" className="divide-border divide-y overflow-hidden rounded-lg border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="space-y-2 px-4 py-3">
          <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/4 animate-pulse rounded" />
        </li>
      ))}
    </ul>
  );
}
