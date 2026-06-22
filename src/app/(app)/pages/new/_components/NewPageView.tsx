"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Editor } from "@/components/editor/Editor";
import { PageBreadcrumb } from "@/components/page/PageBreadcrumb";
import { StickyFormFooter } from "@/components/page/StickyFormFooter";
import { TitleInput } from "@/components/page/TitleInput";
import { VisibilitySelect } from "@/components/page/VisibilitySelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { usePageCreate } from "@/hooks/usePage";
import { useSubmitShortcut } from "@/hooks/useSubmitShortcut";
import { type SpaceId } from "@/lib/api/ids";
import { spaceDetailOptions } from "@/lib/api/queries/space";
import { emptyEditorContent, serializeEditorContent } from "@/lib/editor/content";
import { clearPageDraft, type PageDraft, readPageDraft, writePageDraft } from "@/lib/page/draft";
import { type Visibility, isVisibility, visibilityDescription } from "@/lib/page/visibility";

import { ParentPagePicker, type ParentPagePickerValue } from "./ParentPagePicker";

type Props = {
  spaceId: SpaceId;
};

const DEFAULT_VISIBILITY: Visibility = "DRAFT";
const DRAFT_SAVE_DEBOUNCE_MS = 500;
// 빈 본문의 직렬화 값 — module-level 로 캡처해 dirty 체크 비교 시 매 render 재계산 회피.
const EMPTY_EDITOR_CONTENT = serializeEditorContent(emptyEditorContent());

export function NewPageView({ spaceId }: Props) {
  const router = useRouter();
  const { mutate, isPending } = usePageCreate();
  // 미도착·에러는 cascade 미적용 — BE 가 결국 거부하므로 silently degrade.
  const { data: space } = useQuery(spaceDetailOptions(spaceId));
  const spaceVisibility = space != null && isVisibility(space.visibility) ? space.visibility : null;

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [parent, setParent] = useState<ParentPagePickerValue | null>(null);
  const [content, setContent] = useState(EMPTY_EDITOR_CONTENT);
  // Editor 는 uncontrolled — initialContent 만 1 회 보고 이후는 내부 상태. draft 복원 시 key 로 reset.
  const [editorKey, setEditorKey] = useState<string>("fresh");
  const [initialEditorContent, setInitialEditorContent] = useState<string | undefined>(undefined);

  // 사용자가 실제로 입력한 적이 있는지 추적 — 복원 직후 autosave effect 가 같은 값을 savedAt 만 갱신해
  // TTL 을 실질적으로 무력화하는 회귀를 차단한다. 입력 핸들러에서만 true 로 올린다.
  const hasUserEditedRef = useRef(false);
  // 미해결 autosave timer — submit / cancel 시점에 즉시 취소해 *방금 정리한 draft 를 timer 가 다시 쓰는* race 차단.
  // 본 컴포넌트가 'use client' 라 window.setTimeout 의 반환 타입은 항상 number — Node 환경 (NodeJS.Timeout) 와 혼동하지 않는다.
  const autosaveTimerRef = useRef<number | null>(null);
  // localStorage 에서 발견한 옛 draft — 사용자가 명시 선택할 때까지 폼에 적용하지 않고 banner 로만 노출.
  const [pendingDraft, setPendingDraft] = useState<PageDraft | null>(null);

  function markEdited() {
    hasUserEditedRef.current = true;
    // 사용자가 banner 를 무시하고 새 입력을 시작하면 옛 draft 는 *암묵 버리기* — 사용자 결정으로 간주.
    if (pendingDraft !== null) setPendingDraft(null);
  }

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    markEdited();
    setTitle(event.target.value);
  }
  function handleVisibilityChange(next: Visibility) {
    markEdited();
    setVisibility(next);
  }
  function handleParentChange(next: ParentPagePickerValue | null) {
    markEdited();
    setParent(next);
  }
  function handleContentChange(next: string) {
    markEdited();
    setContent(next);
  }

  // 라우트 invariant — 본 컴포넌트는 한 spaceId 로 mount 되고 이후 prop 이 바뀌지 않는다. 변경 가능 경로가 생기면 본 effect 가
  // 옛 draft 발견 신호를 덮어쓰는 회귀가 생기므로 그 시점에 분기 정책을 별도 결정.
  useEffect(() => {
    const draft = readPageDraft(spaceId);
    if (draft === null) return;
    // localStorage 는 SSR 에서 읽을 수 없어 client mount 후 1 회 sync — 본 effect 는 "외부 시스템 → React state" 의 정합 케이스다.
    // 폼에 즉시 적용하지 않고 banner state 에만 lift — 사용자가 *이어서 작성* 을 명시할 때까지 폼은 빈 상태.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingDraft(draft);
  }, [spaceId]);

  function applyPendingDraft() {
    if (pendingDraft === null) return;
    setTitle(pendingDraft.title);
    setVisibility(pendingDraft.visibility);
    setParent(pendingDraft.parent);
    setContent(pendingDraft.content);
    setInitialEditorContent(pendingDraft.content);
    setEditorKey(`restored-${pendingDraft.savedAt}`);
    // 사용자 명시 행위라 이후 자동저장 시작 — savedAt 이 갱신돼도 *명시 선택의 결과* 라 TTL 무력화가 아니다.
    hasUserEditedRef.current = true;
    setPendingDraft(null);
  }

  function discardPendingDraft() {
    clearPageDraft(spaceId);
    setPendingDraft(null);
  }

  // draft 자동 저장 — 사용자가 입력한 적이 있을 때만 작동. 복원 직후 첫 commit 에서는 hasUserEditedRef 가 false 라 skip.
  useEffect(() => {
    if (!hasUserEditedRef.current) return;
    const handle = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      const hasAnyInput =
        title !== "" ||
        parent !== null ||
        visibility !== DEFAULT_VISIBILITY ||
        content !== EMPTY_EDITOR_CONTENT;
      if (!hasAnyInput) return;
      writePageDraft(spaceId, {
        title,
        content,
        visibility,
        parent,
        savedAt: Date.now(),
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    autosaveTimerRef.current = handle;
    return () => {
      window.clearTimeout(handle);
      if (autosaveTimerRef.current === handle) autosaveTimerRef.current = null;
    };
  }, [spaceId, title, content, visibility, parent]);

  function cancelPendingAutosave() {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }

  function submit() {
    if (title.trim() === "" || isPending) return;
    const parentPageId = parent?.pageId ?? null;
    // 미해결 autosave timer 를 먼저 끊는다 — 성공 직후 timer 가 발화해 *방금 정리한 draft 를 다시 쓰는* race 차단.
    cancelPendingAutosave();
    mutate(
      { spaceId, title, content, visibility, parentPageId },
      {
        onSuccess: (result) => {
          clearPageDraft(spaceId);
          router.push(`/pages/${result.pageId}`);
        },
      },
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  // 취소 시 draft 는 유지 — 부주의한 떠남으로부터 사용자 작성 내용을 보호하는 디자인 결정. 진입 시 자동 복원.
  // *명시적으로 버리고 싶다* 면 별도 UI (예: "초안 비우기" 버튼) 가 자연 — 현재 PR 범위 밖.
  function handleCancel() {
    router.push(`/spaces/${encodeURIComponent(spaceId)}`);
  }

  const formRef = useRef<HTMLFormElement>(null);
  useSubmitShortcut(submit, formRef);

  const canSubmit = title.trim() !== "" && !isPending;
  const breadcrumbTitle = title.trim() === "" ? "새 페이지" : title.trim();

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10"
      noValidate
    >
      {/* TitleInput 자체가 text-3xl hero 역할이라 시각 h1 제거. landmark / 스크린 리더 정합을 위해 sr-only h1 한 줄. */}
      <h1 className="sr-only">새 페이지 작성</h1>

      <header>
        <PageBreadcrumb
          mode="create"
          space={space ?? { spaceId, name: "" }}
          parent={parent ?? undefined}
          currentTitle={breadcrumbTitle}
        />
      </header>

      {pendingDraft !== null && (
        // 가벼운 inline notice — shadcn Card 는 header/content/footer slot 의도라 banner 모양과 mismatch.
        // border + ring 으로 외피만 만들어 작성 도구 톤 (accent 미사용) 정합.
        <div
          role="status"
          aria-live="polite"
          className="bg-muted/40 ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm">이전에 작성하던 글이 있어요. 이어서 작성할까요?</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={discardPendingDraft}>
              버리기
            </Button>
            <Button type="button" size="sm" onClick={applyPendingDraft}>
              이어서 작성
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="new-page-title" className="sr-only">
          제목
        </Label>
        <TitleInput
          id="new-page-title"
          value={title}
          onChange={handleTitleChange}
          disabled={isPending}
          required
          placeholder="제목을 입력해 주세요"
        />
      </div>

      <Editor
        key={editorKey}
        spaceId={spaceId}
        initialContent={initialEditorContent}
        onChange={handleContentChange}
        sourceVisibility={visibility}
        placeholder="본문을 입력해 주세요. [[ 로 다른 페이지를 연결할 수 있습니다."
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="new-page-visibility-trigger"
              className="text-muted-foreground text-xs uppercase"
            >
              공개 범위
            </Label>
            <VisibilitySelect
              id="new-page-visibility-trigger"
              value={visibility}
              onValueChange={handleVisibilityChange}
              spaceVisibility={spaceVisibility}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">{visibilityDescription(visibility)}</p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="new-page-parent-trigger"
              className="text-muted-foreground text-xs uppercase"
            >
              부모 페이지
            </Label>
            <ParentPagePicker
              id="new-page-parent-trigger"
              spaceId={spaceId}
              value={parent}
              onChange={handleParentChange}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">비워 두면 스페이스 루트에 만들어집니다.</p>
          </div>
        </CardContent>
      </Card>

      <StickyFormFooter>
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
          취소
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? "만드는 중..." : "만들기"}
        </Button>
      </StickyFormFooter>
    </form>
  );
}
