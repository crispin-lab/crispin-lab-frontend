"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { PageHeading } from "@/components/PageHeading";
import { SpaceCard } from "@/components/space/SpaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaceList } from "@/hooks/useSpace";
import { toUserMessage } from "@/lib/api/errors";
import { parseSpaceListSearchParams, SPACE_LIST_PAGE_SIZE } from "@/lib/space/listParams";
import { spaceDisplayName } from "@/lib/space/displayName";

import { SpaceListToolbar } from "./SpaceListToolbar";
import { SpacesPagination } from "./SpacesPagination";

type Props = {
  isAuthenticated: boolean;
};

export function SpaceListView({ isAuthenticated }: Props) {
  const searchParams = useSearchParams();
  const params = useMemo(() => parseSpaceListSearchParams(searchParams), [searchParams]);
  // params 참조가 바뀔 때만 새 객체 — 하위 컴포넌트의 useEffect([current]) 가 매 렌더 발화하지 않게.
  const listParams = useMemo(() => ({ ...params, size: SPACE_LIST_PAGE_SIZE }), [params]);

  // Router Cache 가 instance 를 보존해도 fetch 가 stuck 되지 않게 mount 시 강제 refetch.
  const { data, isPending, isError, error, refetch, isFetching } = useSpaceList(listParams, {
    refetchOnMount: "always",
  });

  const hasItems = data !== undefined && data.items.length > 0;
  const isEmpty = data !== undefined && data.items.length === 0;
  const isFiltering = params.keyword !== undefined;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <PageHeading>{isAuthenticated ? "내가 속한 스페이스" : "공개 스페이스"}</PageHeading>
        {hasItems && isAuthenticated && (
          <Button
            nativeButton={false}
            render={<Link href="/spaces/new">새 스페이스 만들기</Link>}
          />
        )}
      </header>

      <SpaceListToolbar current={params} totalElements={data?.totalElements} />

      {isPending && <SpaceListSkeleton />}

      {isError && (
        <ErrorRetryCard
          message={toUserMessage(error)}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {isEmpty && isFiltering && <SpaceListSearchEmpty keyword={params.keyword ?? ""} />}

      {isEmpty && !isFiltering && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm">
              {isAuthenticated ? "아직 스페이스가 없습니다." : "아직 공개된 스페이스가 없습니다."}
            </p>
            {isAuthenticated && (
              <Button
                nativeButton={false}
                render={<Link href="/spaces/new">첫 스페이스 만들기</Link>}
              />
            )}
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
                aria-label={`${spaceDisplayName(space).text} 스페이스로 이동`}
              >
                <SpaceCard space={space} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data !== undefined && (
        <SpacesPagination
          current={params}
          page={data.page}
          totalPages={data.totalPages}
          hasNext={data.hasNext}
        />
      )}
    </section>
  );
}

function SpaceListSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="h-full">
            <CardHeader>
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function SpaceListSearchEmpty({ keyword }: { keyword: string }) {
  return (
    <Card>
      <CardContent className="py-10">
        <p className="text-sm">
          <span className="font-medium">&ldquo;{keyword}&rdquo;</span> 에 일치하는 스페이스가
          없습니다.
        </p>
        <p className="text-muted-foreground mt-1 text-xs">다른 이름으로 검색해 보세요.</p>
      </CardContent>
    </Card>
  );
}
