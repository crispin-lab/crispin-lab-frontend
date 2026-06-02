"use client";

import Link from "next/link";

import { SpaceCard } from "@/components/space/SpaceCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSpaceList } from "@/hooks/useSpace";
import { toUserMessage } from "@/lib/api/errors";

export function SpaceListView() {
  // Router Cache 가 instance 를 보존해도 fetch 가 stuck 되지 않게 mount 시 강제 refetch.
  const { data, isPending, isError, error, refetch, isFetching } = useSpaceList(
    { page: 0, size: 20 },
    { refetchOnMount: "always" },
  );

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">내가 속한 스페이스</h1>
        <Link href="/spaces/new" className={buttonVariants()}>
          새 스페이스 만들기
        </Link>
      </header>

      {isPending && <SpaceListSkeleton />}

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm">{toUserMessage(error)}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "재시도 중..." : "다시 시도"}
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm">아직 스페이스가 없습니다.</p>
            <Link href="/spaces/new" className={buttonVariants()}>
              첫 스페이스 만들기
            </Link>
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((space) => (
            <li key={space.spaceId}>
              <SpaceCard space={space} />
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
