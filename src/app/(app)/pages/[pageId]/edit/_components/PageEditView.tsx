"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Editor } from "@/components/editor/Editor";
import { PageBreadcrumb } from "@/components/page/PageBreadcrumb";
import { StickyFormFooter } from "@/components/page/StickyFormFooter";
import { TitleInput } from "@/components/page/TitleInput";
import { VisibilitySelect } from "@/components/page/VisibilitySelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePage, usePageDelete, usePageUpdate } from "@/hooks/usePage";
import { useSubmitShortcut } from "@/hooks/useSubmitShortcut";
import { ApiError } from "@/lib/api/client";
import { type PageId, type SpaceId, asSpaceId } from "@/lib/api/ids";
import { toUserMessage } from "@/lib/api/errors";
import { spaceDetailOptions } from "@/lib/api/queries/space";
import type { Page } from "@/lib/api/types";
import {
  clearPageEditDraft,
  type PageEditDraft,
  readPageEditDraft,
  writePageEditDraft,
} from "@/lib/page/draft";
import { type Visibility, isVisibility, visibilityDescription } from "@/lib/page/visibility";
import { isSpaceVisibility } from "@/lib/space/visibility";

import { PageTagEditor } from "./PageTagEditor";

const DRAFT_SAVE_DEBOUNCE_MS = 500;

type Props = {
  pageId: PageId;
  initialPage?: Page;
};

export function PageEditView({ pageId, initialPage }: Props) {
  const {
    data: page,
    isPending,
    isError,
    error,
  } = usePage(pageId, {
    initialData: initialPage,
    refetchOnMount: "always",
  });

  if (isPending) {
    return <PageEditSkeleton />;
  }
  if (isError) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    return (
      <p role="alert" className="text-destructive">
        {toUserMessage(error)}
      </p>
    );
  }

  const rawVisibility = page.visibility;
  const initialVisibility: Visibility = isVisibility(rawVisibility) ? rawVisibility : "DRAFT";

  return (
    <PageEditForm
      pageId={pageId}
      initialTitle={page.title}
      initialContent={page.content}
      initialVisibility={initialVisibility}
      spaceId={asSpaceId(page.spaceId)}
      ancestors={page.ancestors}
      currentVersion={page.currentVersion}
      updatedAt={page.updatedAt}
    />
  );
}

type FormProps = {
  pageId: PageId;
  initialTitle: string;
  initialContent: string;
  initialVisibility: Visibility;
  spaceId: SpaceId;
  ancestors: Page["ancestors"];
  currentVersion: number;
  updatedAt: string;
};

function PageEditForm({
  pageId,
  initialTitle,
  initialContent,
  initialVisibility,
  spaceId,
  ancestors,
  currentVersion,
  updatedAt,
}: FormProps) {
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  // currentVersion 을 mount 시점 한 번만 캡처 — 세션 중 usePage 가 invalidate / refetch 로 currentVersion 을
  // 새 값으로 갱신해도 autosave 의 savedAtVersion 이 *진입 당시 기준값* 으로 박혀 stale 감지 신호가 유지된다.
  // 저장 성공 시점에 갱신해 *본인이 방금 저장한* draft 가 다음 세션에서 stale 로 오탐되는 것을 막는다.
  const [pinnedVersion, setPinnedVersion] = useState(currentVersion);

  const [title, setTitle] = useState(initialTitle);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [content, setContent] = useState(initialContent);
  // Editor 의 key 가 바뀌면 unmount/remount — caret/scroll/undo history 가 사라진다. draft 복원 시점에만 의도적으로 reset.
  const [editorKey, setEditorKey] = useState<string>("fresh");
  const [appliedInitialContent, setAppliedInitialContent] = useState(initialContent);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 사용자가 실제로 입력한 적이 있는지 추적 — 복원 직후 autosave effect 가 같은 값을 다시 쓰는 회귀 차단.
  const hasUserEditedRef = useRef(false);
  // 본 컴포넌트는 'use client' — window.setTimeout 반환은 항상 number.
  const autosaveTimerRef = useRef<number | null>(null);
  // localStorage 에서 발견한 미저장 변경 — 사용자가 명시 선택할 때까지 폼은 원본 그대로.
  const [pendingDraft, setPendingDraft] = useState<PageEditDraft | null>(null);

  const { mutate, isPending } = usePageUpdate();
  const { mutate: deleteMutate, isPending: isDeleting } = usePageDelete();
  // 미도착·에러는 cascade 미적용 — BE 가 결국 거부하므로 silently degrade.
  const { data: space } = useQuery(spaceDetailOptions(spaceId));

  const spaceVisibility =
    space != null && isSpaceVisibility(space.visibility) ? space.visibility : null;
  // stale draft (다른 디바이스/세션 변경) 가 보일 때는 *암묵 버리기* 가 사용자 의도와 어긋날 수 있으므로
  // banner 명시 클릭 전에는 autosave 자체를 보류해 옛 변경의 silent overwrite 를 막는다.
  const isStaleDraft = pendingDraft !== null && pendingDraft.savedAtVersion !== pinnedVersion;

  function markEdited() {
    hasUserEditedRef.current = true;
    // 같은 version 의 draft (= 이전 세션에서 본 사용자 자신의 미저장) 만 *암묵 버리기* 로 본다.
    // stale draft 는 banner 를 유지해 사용자가 명시 선택할 때까지 옛 변경을 보호.
    if (pendingDraft !== null && !isStaleDraft) setPendingDraft(null);
  }
  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    markEdited();
    setTitle(event.target.value);
  }
  function handleVisibilityChange(next: Visibility) {
    markEdited();
    setVisibility(next);
  }
  function handleContentChange(next: string) {
    markEdited();
    setContent(next);
  }

  function applyPendingDraft() {
    if (pendingDraft === null) return;
    setTitle(pendingDraft.title);
    setVisibility(pendingDraft.visibility);
    setContent(pendingDraft.content);
    setAppliedInitialContent(pendingDraft.content);
    setEditorKey(`restored-${pendingDraft.savedAt}`);
    hasUserEditedRef.current = true;
    setPendingDraft(null);
  }
  function discardPendingDraft() {
    clearPageEditDraft(pageId);
    setPendingDraft(null);
  }
  function cancelPendingAutosave() {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }
  function handleSave() {
    if (title.trim() === "" || isPending || isDeleting) return;
    cancelPendingAutosave();
    mutate(
      { pageId, body: { title, content, visibility } },
      {
        onSuccess: (result) => {
          clearPageEditDraft(pageId);
          setPinnedVersion(result.version);
        },
      },
    );
  }
  function handleDeleteConfirm() {
    // handleSave 와 같은 자리에 cancel — autosave timer 가 deleteMutate.onSuccess 보다 늦게 발화해
    // *이미 삭제된 pageId* 자리에 orphan draft 가 TTL 7 일 누적되는 race 차단.
    cancelPendingAutosave();
    deleteMutate(pageId, {
      onSuccess: () => {
        clearPageEditDraft(pageId);
        setDeleteOpen(false);
        router.push(`/spaces/${encodeURIComponent(spaceId)}`);
      },
    });
  }

  useEffect(() => {
    const draft = readPageEditDraft(pageId);
    if (draft === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingDraft(draft);
  }, [pageId]);

  // 자동 저장 — 사용자가 입력한 적이 있을 때만 작동. 복원 직후 첫 commit 은 hasUserEditedRef 가 false 라 skip.
  // stale draft (다른 곳에서 page update) 가 banner 로 떠 있는 동안은 silent overwrite 방지 차원에서 보류.
  useEffect(() => {
    if (!hasUserEditedRef.current) return;
    if (isStaleDraft) return;
    const handle = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      writePageEditDraft(pageId, {
        title,
        content,
        visibility,
        savedAtVersion: pinnedVersion,
        savedAt: Date.now(),
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    autosaveTimerRef.current = handle;
    return () => {
      window.clearTimeout(handle);
      if (autosaveTimerRef.current === handle) autosaveTimerRef.current = null;
    };
  }, [pageId, title, content, visibility, pinnedVersion, isStaleDraft]);

  useSubmitShortcut(handleSave, articleRef);

  const busy = isPending || isDeleting;
  const canSave = title.trim() !== "" && !busy;
  const breadcrumbTitle = title.trim() === "" ? initialTitle : title.trim();

  return (
    <article ref={articleRef} className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      {/* 새 페이지 화면과 같은 hero 사다리 — TitleInput 이 시각 hero, h1 은 sr-only landmark. */}
      <h1 className="sr-only">페이지 편집</h1>

      <header>
        <PageBreadcrumb
          mode="detail"
          space={space ?? { spaceId, name: "" }}
          ancestors={ancestors}
          currentTitle={breadcrumbTitle}
        />
      </header>

      {pendingDraft !== null && (
        // 미저장 변경 알림 — 새 페이지 화면의 banner 와 같은 패턴. version 충돌 시 한 문장 추가.
        <div
          role="status"
          aria-live="polite"
          className="bg-muted/40 ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <p className="text-sm">저장하지 않은 변경 사항이 있어요. 이어서 편집할까요?</p>
            {isStaleDraft && (
              <p className="text-muted-foreground text-xs">
                다른 곳에서 페이지가 업데이트되었어요. 이전 변경을 그대로 불러오면 최신 내용을
                덮어쓸 수 있습니다.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={discardPendingDraft}>
              버리기
            </Button>
            <Button type="button" size="sm" onClick={applyPendingDraft}>
              이어서 편집
            </Button>
          </div>
        </div>
      )}

      <TitleInput
        aria-label="제목"
        value={title}
        onChange={handleTitleChange}
        disabled={busy}
        placeholder="제목을 입력해 주세요"
      />

      <PageTagEditor pageId={pageId} spaceId={spaceId} />

      <Editor
        key={editorKey}
        spaceId={spaceId}
        initialContent={appliedInitialContent}
        editable={!busy}
        sourceVisibility={visibility}
        onChange={handleContentChange}
        placeholder="본문을 입력해 주세요. [[ 로 다른 페이지를 연결할 수 있습니다."
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="page-edit-visibility-trigger"
              className="text-muted-foreground text-xs uppercase"
            >
              공개 범위
            </Label>
            <VisibilitySelect
              id="page-edit-visibility-trigger"
              value={visibility}
              onValueChange={handleVisibilityChange}
              spaceVisibility={spaceVisibility}
              disabled={busy}
            />
            <p className="text-muted-foreground text-xs">{visibilityDescription(visibility)}</p>
          </div>

          <div className="border-border space-y-1 border-t pt-3">
            <p className="text-muted-foreground text-xs uppercase">버전 정보</p>
            <p className="text-muted-foreground text-xs">
              v{currentVersion} · {formatPageTimestamp(updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <StickyFormFooter>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={busy}
          className="mr-auto"
        >
          페이지 삭제
        </Button>
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {isPending ? "저장 중…" : "저장"}
        </Button>
      </StickyFormFooter>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="페이지를 삭제할까요?"
        description="삭제하면 되돌릴 수 없습니다."
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </article>
  );
}

function PageEditSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10"
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-10 w-2/3" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function formatPageTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
