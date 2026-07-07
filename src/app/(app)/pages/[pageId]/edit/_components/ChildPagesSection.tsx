"use client";

import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  MoreHorizontal,
  Unlink,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormattedTime } from "@/components/common/FormattedTime";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageList, usePageMove, usePageReorder } from "@/hooks/usePage";
import { toUserMessage } from "@/lib/api/errors";
import { asPageId, type PageId, type SpaceId } from "@/lib/api/ids";
import type { PageSummary } from "@/lib/api/types";

const CHILD_LIST_SIZE = 100;

type Props = {
  pageId: PageId;
  spaceId: SpaceId;
};

export function ChildPagesSection({ pageId, spaceId }: Props) {
  const children = usePageList({
    spaceId,
    parentPageId: pageId,
    sort: "TREE",
    size: CHILD_LIST_SIZE,
  });
  const reorder = usePageReorder();
  const move = usePageMove();
  // reorder / move 성공 직후 invalidate → 자녀 목록은 background refetch (isFetching=true, keepPreviousData 로 data 는 stale).
  // isFetching 을 가드에 넣어야 stale index 로 다음 클릭이 나가는 race 를 막는다.
  const isBusy = reorder.isPending || move.isPending || children.isFetching;

  return (
    <section aria-labelledby="child-pages-heading" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="child-pages-heading" className="text-lg font-medium">
          자녀 페이지
        </h2>
        {children.data !== undefined && (
          <span className="text-muted-foreground text-xs">{children.data.items.length}개</span>
        )}
      </div>

      {children.isPending && (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {children.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toUserMessage(children.error)}
        </p>
      )}

      {children.data !== undefined && children.data.items.length === 0 && (
        <p className="text-muted-foreground text-sm">아직 자녀 페이지가 없습니다.</p>
      )}

      {children.data !== undefined && children.data.items.length > 0 && (
        <ul className="divide-border divide-y overflow-hidden rounded-lg border">
          {children.data.items.map((child, index) => (
            <ChildPageRow
              key={child.pageId}
              child={child}
              index={index}
              total={children.data.items.length}
              isBusy={isBusy}
              onReorder={(displayOrder) =>
                reorder.mutate({
                  pageId: asPageId(child.pageId),
                  body: { displayOrder },
                })
              }
              onDetach={() =>
                move.mutate({
                  pageId: asPageId(child.pageId),
                  body: { parentPageId: null },
                })
              }
            />
          ))}
        </ul>
      )}

      {children.data?.hasNext === true && (
        <p className="text-muted-foreground text-xs">
          자녀 페이지는 최대 {CHILD_LIST_SIZE}개까지 표시됩니다.
        </p>
      )}
    </section>
  );
}

type RowProps = {
  child: PageSummary;
  index: number;
  total: number;
  isBusy: boolean;
  onReorder: (displayOrder: number) => void;
  onDetach: () => void;
};

function ChildPageRow({ child, index, total, isBusy, onReorder, onDetach }: RowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const canReorder = total > 1;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link
          href={`/pages/${encodeURIComponent(child.pageId)}`}
          className="hover:text-accent-foreground truncate font-medium"
        >
          {child.title}
        </Link>
        <p className="text-muted-foreground mt-1 text-xs">
          수정 <FormattedTime iso={child.updatedAt} />
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isBusy}
              aria-label={`${child.title} 액션 열기`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isFirst || !canReorder || isBusy}
            onClick={() => onReorder(0)}
          >
            <ChevronsUp />맨 앞으로
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isFirst || !canReorder || isBusy}
            onClick={() => onReorder(index - 1)}
          >
            <ChevronUp />
            앞으로 이동
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLast || !canReorder || isBusy}
            onClick={() => onReorder(index + 1)}
          >
            <ChevronDown />
            뒤로 이동
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLast || !canReorder || isBusy}
            onClick={() => onReorder(total - 1)}
          >
            <ChevronsDown />맨 뒤로
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isBusy} onClick={onDetach}>
            <Unlink />이 페이지에서 분리
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
