"use client";

import { ChevronDown, ChevronsDown, ChevronsUp, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageList, usePageReorder } from "@/hooks/usePage";
import { type PageId, type SpaceId } from "@/lib/api/ids";

const SIBLING_LIST_SIZE = 100;

type Props = {
  pageId: PageId;
  spaceId: SpaceId;
  parentPageId: PageId | null;
};

// BE 는 `page.reorder(displayOrder)` 로 값만 갈아끼우고 형제 재정규화는 하지 않는다 (BE ExposedPageSearchAdapter 의
// TREE tie-break: displayOrder ASC → id ASC). schema description ("0 부터 시작, 작을수록 앞") 이 sequential 을 함의하므로
// target 자리의 index 를 그대로 보내는 것을 표준으로 삼는다 — 반복 reorder 로 인한 값 drift 가 발견되면 BE 별도 티켓.
export function SiblingOrderActions({ pageId, spaceId, parentPageId }: Props) {
  const siblings = usePageList({
    spaceId,
    parentPageId,
    sort: "TREE",
    size: SIBLING_LIST_SIZE,
  });
  const reorder = usePageReorder();

  const items = siblings.data?.items ?? [];
  const currentIdx = items.findIndex((item) => item.pageId === pageId);
  const listReady = !siblings.isPending && !siblings.isError && currentIdx !== -1;
  const isFirst = currentIdx <= 0;
  const isLast = currentIdx === items.length - 1;
  const canReorder = listReady && items.length > 1;
  // reorder 성공 직후 invalidate → 형제 목록은 background refetch (isFetching=true, keepPreviousData 로 data 는 stale).
  // isFetching 을 가드에 넣어야 stale currentIdx 로 다음 클릭이 나가는 race 를 막는다.
  const isBusy = reorder.isPending || siblings.isFetching;

  function moveTo(targetIdx: number) {
    reorder.mutate({ pageId, body: { displayOrder: targetIdx } });
  }

  const disabledReason = reorder.isPending
    ? "이동 중이에요."
    : siblings.isFetching || !listReady
      ? "형제 목록을 불러오는 중이에요."
      : !canReorder
        ? "형제가 하나뿐이라 순서를 바꿀 수 없어요."
        : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={!canReorder || isBusy}
            aria-label="형제 페이지 순서 변경"
            title={disabledReason}
          >
            <ChevronDown className="mr-1" />
            순서
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuItem disabled={isFirst || isBusy} onClick={() => moveTo(0)}>
          <ChevronsUp />맨 앞으로
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isFirst || isBusy} onClick={() => moveTo(currentIdx - 1)}>
          <ChevronUp />
          앞으로 이동
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast || isBusy} onClick={() => moveTo(currentIdx + 1)}>
          <ChevronDown />
          뒤로 이동
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast || isBusy} onClick={() => moveTo(items.length - 1)}>
          <ChevronsDown />맨 뒤로
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
