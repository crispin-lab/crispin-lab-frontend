"use client";

import { useState } from "react";

import { ParentPagePicker, type ParentPagePickerValue } from "@/components/page/ParentPagePicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { usePageMove } from "@/hooks/usePage";
import { asPageId, type PageId, type SpaceId } from "@/lib/api/ids";

type Props = {
  pageId: PageId;
  spaceId: SpaceId;
  currentParent: ParentPagePickerValue | null;
};

export function MoveToParentAction({ pageId, spaceId, currentParent }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ParentPagePickerValue | null>(currentParent);
  const move = usePageMove();

  function handleOpenChange(next: boolean) {
    // isPending 동안 dialog 를 닫으면 mutation 만 in-flight 로 남아 사용자가 재시도할 표면이 사라진다.
    if (move.isPending && !next) return;
    setOpen(next);
    if (next) setPicked(currentParent);
  }

  const currentParentId = currentParent?.pageId ?? null;
  const pickedParentId = picked?.pageId ?? null;
  const isSameParent = pickedParentId === currentParentId;

  // 자기 자신은 `PAGE_PARENT_CYCLE`, 현재 부모는 `PAGE_PARENT_UNCHANGED` 예방. 후자는 confirm disable 로도 잡히지만
  // 사용자가 왜 disable 인지 즉시 알기 어려워 picker 리스트에서 아예 안 보이게.
  const excludePageIds = currentParentId !== null ? [pageId, asPageId(currentParentId)] : [pageId];

  function handleConfirm() {
    move.mutate(
      { pageId, body: { parentPageId: pickedParentId } },
      {
        onSuccess: () => setOpen(false),
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        disabled={move.isPending}
      >
        부모 페이지 변경…
      </Button>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>부모 페이지 변경</AlertDialogTitle>
            <AlertDialogDescription>
              이 페이지의 새 부모를 선택해 주세요. 선택하지 않으면 스페이스 루트로 이동합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ParentPagePicker
            spaceId={spaceId}
            value={picked}
            onChange={setPicked}
            disabled={move.isPending}
            excludePageIds={excludePageIds}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={move.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={isSameParent || move.isPending} onClick={handleConfirm}>
              {move.isPending ? "이동 중…" : "이동"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
