"use client";

import { MoreHorizontal, UsersIcon } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type UseQueryResult } from "@tanstack/react-query";

import { FormattedTime } from "@/components/common/FormattedTime";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { PageHeading } from "@/components/PageHeading";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useAuth";
import { useSpaceDelete, useSpaceDetail } from "@/hooks/useSpace";
import { useSpaceMemberList } from "@/hooks/useSpaceMember";
import { useSpaceVisitRecord } from "@/hooks/useSpaceVisitRecord";
import { usePageList } from "@/hooks/usePage";
import { ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { SpaceId } from "@/lib/api/ids";
import type { PageSearchResult, Space } from "@/lib/api/types";
import { isSpaceMemberRole } from "@/lib/space/memberRole";
import { spaceDisplayName } from "@/lib/space/displayName";
import { cn } from "@/lib/utils";

type Props = {
  spaceId: SpaceId;
  isAuthenticated: boolean;
  initialSpace?: Space;
};

export function SpaceDetailView({ spaceId, isAuthenticated, initialSpace }: Props) {
  const router = useRouter();
  const spaceQuery = useSpaceDetail(spaceId, {
    refetchOnMount: "always",
    initialData: initialSpace,
  });
  const pageListQuery = usePageList({ spaceId }, { refetchOnMount: "always" });
  const meQuery = useMe();
  /*
  todo    :: LAB-159 (SpaceGetResponse.viewerRole) 완료 후 이 warm-up fetch 제거 — 지금은 소규모 스페이스 (≤100명) 한정 정확.
   author :: crispin
   date   :: 2026-07-04T00:00:00KST
   ticket :: LAB-159
   */
  const memberListQuery = useSpaceMemberList(
    spaceId,
    { page: 0, size: 100 },
    { enabled: isAuthenticated && meQuery.data != null },
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutate: deleteMutate, isPending: isDeleting } = useSpaceDelete();
  const { mutate: recordVisit } = useSpaceVisitRecord();

  // 백엔드가 anonymous 요청을 401 로 거절하므로 로그인 사용자에게만 발화.
  useEffect(() => {
    if (!isAuthenticated) return;
    recordVisit(spaceId);
  }, [isAuthenticated, recordVisit, spaceId]);

  if (
    spaceQuery.isError &&
    spaceQuery.error instanceof ApiError &&
    (spaceQuery.error.status === 403 || spaceQuery.error.status === 404)
  ) {
    notFound();
  }

  const newPageHref = `/pages/new?spaceId=${encodeURIComponent(spaceId)}`;

  function handleDeleteConfirm() {
    deleteMutate(spaceId, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push("/spaces");
      },
    });
  }

  const canWrite = spaceQuery.data?.canWrite ?? false;
  const canEdit = spaceQuery.data?.canEdit ?? false;

  const meUserId = meQuery.data?.userId;
  const viewerMember =
    meUserId != null ? memberListQuery.data?.items.find((m) => m.userId === meUserId) : undefined;
  const viewerRole =
    viewerMember != null && isSpaceMemberRole(viewerMember.role) ? viewerMember.role : undefined;
  const canManageMembers = viewerRole === "OWNER";
  // 진입점 button flicker 방지 — role 판정이 확정되기 전에는 skeleton placeholder 로 자리를 잡는다.
  // 확정 조건: 비로그인 · useMe 완료 + anonymous · member list 응답 도착 (data 나 error) 중 하나.
  // memberListQuery 가 error 로 떨어져도 확정으로 봐 non-OWNER 흐름으로 자연 fallback — skeleton 이 무한 유지되지 않게.
  const isViewerRoleResolved =
    !isAuthenticated || (!meQuery.isPending && meQuery.data == null) || !memberListQuery.isPending;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <SpaceMetaSection
        query={spaceQuery}
        spaceId={spaceId}
        isDeleting={isDeleting}
        onDeleteRequest={() => setDeleteOpen(true)}
        isAuthenticated={isAuthenticated}
        canEdit={canEdit}
        canManageMembers={canManageMembers}
        isViewerRoleResolved={isViewerRoleResolved}
      />
      <PageListSection
        query={pageListQuery}
        newPageHref={newPageHref}
        isAuthenticated={isAuthenticated}
        canWrite={canWrite}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="스페이스를 삭제할까요?"
        description="스페이스가 삭제됩니다. 되돌릴 수 없습니다."
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  );
}

function SpaceMetaSection({
  query,
  spaceId,
  isDeleting,
  onDeleteRequest,
  isAuthenticated,
  canEdit,
  canManageMembers,
  isViewerRoleResolved,
}: {
  query: UseQueryResult<Space, ApiError>;
  spaceId: SpaceId;
  isDeleting: boolean;
  onDeleteRequest: () => void;
  isAuthenticated: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  isViewerRoleResolved: boolean;
}) {
  const router = useRouter();
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
  const name = spaceDisplayName(space);

  return (
    <header aria-labelledby="space-meta-heading" className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <PageHeading id="space-meta-heading" className={cn(name.isFallback && "italic")}>
          {name.text}
        </PageHeading>
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            {!isViewerRoleResolved ? (
              <Skeleton className="h-7 w-16" aria-hidden="true" />
            ) : (
              canManageMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link href={`/spaces/${encodeURIComponent(spaceId)}/members`}>
                      <UsersIcon /> 멤버
                    </Link>
                  }
                />
              )
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="더보기" disabled={isDeleting}>
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {canEdit && (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push(`/spaces/${encodeURIComponent(spaceId)}/edit`)}
                    >
                      스페이스 편집
                    </DropdownMenuItem>
                    <DropdownMenuLinkItem
                      render={
                        <Link href={`/spaces/${encodeURIComponent(spaceId)}/audit-log`}>
                          편집 이력
                        </Link>
                      }
                    />
                  </>
                )}
                <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
                  스페이스 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {description !== "" && <p className="text-muted-foreground leading-8">{description}</p>}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <VisibilityBadge visibility={space.visibility} />
        <span>
          수정 <FormattedTime iso={space.updatedAt} />
        </span>
      </div>
    </header>
  );
}

function PageListSection({
  query,
  newPageHref,
  isAuthenticated,
  canWrite,
}: {
  query: UseQueryResult<PageSearchResult, ApiError>;
  newPageHref: string;
  isAuthenticated: boolean;
  canWrite: boolean;
}) {
  const hasItems = query.data !== undefined && query.data.items.length > 0;
  const isEmpty = query.data !== undefined && query.data.items.length === 0;

  return (
    <section aria-labelledby="page-list-heading" className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h2 id="page-list-heading" className="text-2xl font-semibold">
          페이지
        </h2>
        {hasItems && canWrite && (
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
            <p className="text-sm">
              {isAuthenticated ? "아직 페이지가 없습니다." : "아직 공개된 페이지가 없습니다."}
            </p>
            {canWrite && (
              <Button
                nativeButton={false}
                render={<Link href={newPageHref}>첫 페이지 만들기</Link>}
              />
            )}
          </CardContent>
        </Card>
      )}

      {hasItems && (
        <ul className="divide-border divide-y overflow-hidden rounded-lg border">
          {query.data.items.map((page) => (
            <li key={page.pageId}>
              <Link
                href={`/pages/${encodeURIComponent(page.pageId)}`}
                className="hover:bg-muted/60 hover:shadow-accent-glow focus-visible:bg-muted/60 block px-4 py-3 transition-shadow duration-200 ease-out focus-visible:outline-none"
              >
                <p className="font-medium">{page.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  수정 <FormattedTime iso={page.updatedAt} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SpaceMetaSkeleton() {
  return (
    <header aria-hidden="true" className="space-y-3">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/4" />
    </header>
  );
}

function PageListSkeleton() {
  return (
    <ul aria-hidden="true" className="divide-border divide-y overflow-hidden rounded-lg border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="space-y-2 px-4 py-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </li>
      ))}
    </ul>
  );
}
