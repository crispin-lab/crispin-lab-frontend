"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageList } from "@/hooks/usePage";
import { toUserMessage } from "@/lib/api/errors";
import { asPageId, type PageId, type SpaceId } from "@/lib/api/ids";
import {
  ancestorIdsOf,
  buildPageTree,
  filterPageItemsByQuery,
  matchedPageIdsOf,
} from "@/lib/page/tree";
import { cn } from "@/lib/utils";

import { PageTreeNode } from "./PageTreeNode";

// 사이드바는 "스페이스 전체 트리" 의미라 paging 가정이 깨진다 — 백엔드 size 상한 (200) 까지 한 번에 받고
// 그래도 잘리면 hasNext 안내. 백엔드 트리 endpoint 가 생기면 그쪽으로 이전.
const TREE_PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 150;

type Props = {
  spaceId: SpaceId;
  activePageId: PageId;
  className?: string;
};

export function PageTreeSidebar({ spaceId, activePageId, className }: Props) {
  const query = usePageList({ spaceId, size: TREE_PAGE_SIZE });

  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(rawSearch.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [rawSearch]);

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const filteredItems = useMemo(() => filterPageItemsByQuery(items, search), [items, search]);
  const tree = useMemo(() => buildPageTree(filteredItems), [filteredItems]);

  const defaultExpandedIds = useMemo(() => {
    const expanded = new Set<string>(ancestorIdsOf(items, activePageId));
    if (search === "") return expanded;
    for (const matchId of matchedPageIdsOf(items, search)) {
      for (const ancestor of ancestorIdsOf(items, asPageId(matchId))) {
        expanded.add(ancestor);
      }
    }
    return expanded;
  }, [items, activePageId, search]);

  const newPageHref = `/pages/new?spaceId=${encodeURIComponent(spaceId)}`;
  const isTruncated = query.data?.hasNext === true;
  const isDataReady = query.data !== undefined;
  const hasItems = isDataReady && items.length > 0;
  const isSearchingEmpty = hasItems && search !== "" && filteredItems.length === 0;

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

      {isDataReady && items.length === 0 && (
        <div className="space-y-3 px-1 py-2">
          <p className="text-muted-foreground text-sm">이 스페이스에는 아직 페이지가 없습니다.</p>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={newPageHref}>첫 페이지 만들기</Link>}
          />
        </div>
      )}

      {hasItems && (
        <>
          <div className="mb-3 px-1">
            <SearchInput
              aria-label="페이지 트리 검색"
              placeholder="페이지 검색"
              value={rawSearch}
              onChange={(event) => setRawSearch(event.target.value)}
            />
          </div>
          <div className="mb-3 px-1">
            <Button
              size="sm"
              className="w-full"
              nativeButton={false}
              render={<Link href={newPageHref}>새 페이지 만들기</Link>}
            />
          </div>
          {isSearchingEmpty ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">검색 결과가 없습니다.</p>
          ) : (
            // 수동 접은 노드도 함께 reset 되는 trade-off — 정교한 lift+reducer 는 별도 티켓.
            <ul key={`${activePageId}::${search}`} aria-label="페이지 트리" className="space-y-0.5">
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
          )}
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
        <li key={i}>
          <Skeleton className="h-6" style={{ width }} />
        </li>
      ))}
    </ul>
  );
}
