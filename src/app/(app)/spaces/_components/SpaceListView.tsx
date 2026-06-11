"use client";

import Link from "next/link";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { PageHeading } from "@/components/PageHeading";
import { SpaceCard } from "@/components/space/SpaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSpaceList } from "@/hooks/useSpace";
import { toUserMessage } from "@/lib/api/errors";

export function SpaceListView() {
  // Router Cache 가 instance 를 보존해도 fetch 가 stuck 되지 않게 mount 시 강제 refetch.
  const { data, isPending, isError, error, refetch, isFetching } = useSpaceList(
    { page: 0, size: 20 },
    { refetchOnMount: "always" },
  );

  const hasItems = data !== undefined && data.items.length > 0;
  const isEmpty = data !== undefined && data.items.length === 0;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <PageHeading>내가 속한 스페이스</PageHeading>
        {hasItems && (
          <Button
            nativeButton={false}
            render={<Link href="/spaces/new">새 스페이스 만들기</Link>}
          />
        )}
      </header>

      {isPending && <SpaceListSkeleton />}

      {isError && (
        <ErrorRetryCard
          message={toUserMessage(error)}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {isEmpty && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm">아직 스페이스가 없습니다.</p>
            <Button
              nativeButton={false}
              render={<Link href="/spaces/new">첫 스페이스 만들기</Link>}
            />
          </CardContent>
        </Card>
      )}

      {hasItems && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((space) => (
            <li key={space.spaceId}>
              <Link
                href={`/spaces/${encodeURIComponent(space.spaceId)}`}
                className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label={`${space.name} 스페이스로 이동`}
              >
                <SpaceCard space={space} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SpaceListSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="h-full animate-pulse">
            <CardHeader>
              <div className="bg-muted h-4 w-1/2 rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-muted h-3 w-3/4 rounded" />
              <div className="bg-muted h-3 w-1/3 rounded" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
