"use client";

import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound, type ReadonlyURLSearchParams, useSearchParams } from "next/navigation";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { PageHeading } from "@/components/PageHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaceAuditLog } from "@/hooks/useSpaceAuditLog";
import { ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { SpaceId } from "@/lib/api/ids";
import type { Space } from "@/lib/api/types";
import { spaceDisplayName } from "@/lib/space/displayName";
import { cn } from "@/lib/utils";

import { AuditLogPagination } from "./AuditLogPagination";
import { AuditTimelineItem } from "./AuditTimelineItem";
import { AUDIT_LOG_DEFAULT_SIZE } from "./constants";

type Props = {
  spaceId: SpaceId;
  space: Space;
};

export function SpaceAuditLogView({ spaceId, space }: Props) {
  const searchParams = useSearchParams();
  const { page, size } = parseAuditLogParams(searchParams);
  const query = useSpaceAuditLog(spaceId, { page, size }, { refetchOnMount: "always" });
  const spaceName = spaceDisplayName(space);

  // audit endpoint 자체가 canEdit 을 재확인한다 — 권한 revoke race 를 존재 비노출로 흡수. !isFetching 은 refetch 도중 stale 회복 여지.
  if (
    query.isError &&
    !query.isFetching &&
    query.error instanceof ApiError &&
    (query.error.status === 403 || query.error.status === 404)
  ) {
    notFound();
  }

  return (
    <>
      <header className="space-y-3">
        <nav
          aria-label="상위 경로"
          className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm"
        >
          <Link
            href={`/spaces/${encodeURIComponent(spaceId)}`}
            className={cn(
              "hover:text-foreground inline-flex items-center gap-1 transition-colors",
              spaceName.isFallback && "italic",
            )}
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
            {spaceName.text}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">편집 이력</span>
        </nav>
        <PageHeading>편집 이력</PageHeading>
        <p className="text-muted-foreground text-sm">
          스페이스 이름·설명·공개 범위의 등록·수정·삭제 이력이 최신순으로 표시됩니다.
        </p>
      </header>

      <AuditLogSection query={query} />

      {query.data != null && query.data.totalPages > 1 && (
        <AuditLogPagination
          spaceId={spaceId}
          page={page}
          size={size}
          totalPages={query.data.totalPages}
        />
      )}
    </>
  );
}

function AuditLogSection({ query }: { query: ReturnType<typeof useSpaceAuditLog> }) {
  if (query.isPending) {
    return <AuditLogSkeleton />;
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

  const items = query.data.items;
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          아직 편집 이력이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="space-y-0">
      {items.map((entry) => (
        <AuditTimelineItem key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}

function AuditLogSkeleton() {
  return (
    <ol className="space-y-0" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className="border-border/60 relative border-l pl-6">
          <span className="bg-muted-foreground/40 absolute top-2 -left-[5px] size-2.5 rounded-full" />
          <div className="space-y-2 pb-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function parseAuditLogParams(raw: ReadonlyURLSearchParams): { page: number; size: number } {
  const rawPage = raw.get("page");
  const parsedPage = rawPage !== null ? Number(rawPage) : 0;
  const page = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

  const rawSize = raw.get("size");
  const parsedSize = rawSize !== null ? Number(rawSize) : AUDIT_LOG_DEFAULT_SIZE;
  const size =
    Number.isInteger(parsedSize) && parsedSize >= 1 && parsedSize <= 100
      ? parsedSize
      : AUDIT_LOG_DEFAULT_SIZE;

  return { page, size };
}
