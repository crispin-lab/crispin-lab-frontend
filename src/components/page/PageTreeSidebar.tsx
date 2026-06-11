"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { Button } from "@/components/ui/button";
import { usePageList } from "@/hooks/usePage";
import { toUserMessage } from "@/lib/api/errors";
import type { PageId, SpaceId } from "@/lib/api/ids";
import { ancestorIdsOf, buildPageTree } from "@/lib/page/tree";
import { cn } from "@/lib/utils";

import { PageTreeNode } from "./PageTreeNode";

// 사이드바는 "스페이스 전체 트리" 의미라 paging 가정이 깨진다 — 백엔드 size 상한 (200) 까지 한 번에 받고
// 그래도 잘리면 hasNext 안내. 백엔드 트리 endpoint 가 생기면 그쪽으로 이전.
const TREE_PAGE_SIZE = 200;

type Props = {
  spaceId: SpaceId;
  activePageId: PageId;
  className?: string;
};

export function PageTreeSidebar({ spaceId, activePageId, className }: Props) {
  const query = usePageList({ spaceId, size: TREE_PAGE_SIZE });

  const tree = useMemo(() => buildPageTree(query.data?.items ?? []), [query.data]);
  const defaultExpandedIds = useMemo(
    () => ancestorIdsOf(query.data?.items ?? [], activePageId),
    [query.data, activePageId],
  );

  const newPageHref = `/pages/new?spaceId=${encodeURIComponent(spaceId)}`;
  const isTruncated = query.data?.hasNext === true;

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-border rounded-lg border p-3",
        className,
      )}
    >
      {query.isPending && <PageTreeSkeleton />}

      {query.isError && (
        <ErrorRetryCard
          message={toUserMessage(query.error)}
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      )}

      {query.data !== undefined && query.data.items.length === 0 && (
        <div className="space-y-3 px-1 py-2">
          <p className="text-muted-foreground text-sm">이 스페이스에는 아직 페이지가 없습니다.</p>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={newPageHref}>첫 페이지 만들기</Link>}
          />
        </div>
      )}

      {query.data !== undefined && query.data.items.length > 0 && (
        <>
          <div className="mb-3 px-1">
            <Button
              size="sm"
              className="w-full"
              nativeButton={false}
              render={<Link href={newPageHref}>새 페이지 만들기</Link>}
            />
          </div>
          {/* activePageId 가 바뀌면 트리 전체를 리셋해 새 active 의 조상 체인이 자동 펼쳐지게.
              사용자가 수동 접은 노드도 함께 리셋되는 trade-off — 정교한 lift+reducer 는 별도 티켓. */}
          <ul key={activePageId} aria-label="페이지 트리" className="space-y-0.5">
            {tree.map((node) => (
              <PageTreeNode
                key={node.page.pageId}
                node={node}
                activePageId={activePageId}
                defaultExpandedIds={defaultExpandedIds}
                level={0}
              />
            ))}
          </ul>
          {isTruncated && (
            <p className="text-muted-foreground mt-3 px-1 text-xs">
              스페이스가 커서 일부만 표시됩니다.
            </p>
          )}
        </>
      )}
    </aside>
  );
}

function PageTreeSkeleton() {
  // 너비를 미세 변주해 트리 노드 느낌을 살림 (균일한 회색 막대는 로딩이 길 때 어색).
  const widths = ["85%", "70%", "92%", "65%", "78%", "88%"];
  return (
    <ul aria-hidden="true" className="space-y-1.5">
      {widths.map((width, i) => (
        <li key={i} className="bg-muted h-6 animate-pulse rounded" style={{ width }} />
      ))}
    </ul>
  );
}
