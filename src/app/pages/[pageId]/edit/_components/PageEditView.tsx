"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Editor } from "@/components/editor/Editor";
import { TitleInput } from "@/components/page/TitleInput";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { Button } from "@/components/ui/button";
import { usePage, usePageUpdate } from "@/hooks/usePage";
import { type PageId, type SpaceId, asSpaceId } from "@/lib/api/ids";
import { toUserMessage } from "@/lib/api/errors";

type Props = {
  pageId: PageId;
};

export function PageEditView({ pageId }: Props) {
  const { data: page, isPending, isError, error } = usePage(pageId);

  if (isPending) {
    return <PageEditSkeleton />;
  }
  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        {toUserMessage(error)}
      </p>
    );
  }

  return (
    <PageEditForm
      pageId={pageId}
      initialTitle={page.title}
      initialContent={page.content}
      visibility={page.visibility}
      spaceId={asSpaceId(page.spaceId)}
      currentVersion={page.currentVersion}
      updatedAt={page.updatedAt}
    />
  );
}

type FormProps = {
  pageId: PageId;
  initialTitle: string;
  initialContent: string;
  visibility: string;
  spaceId: SpaceId;
  currentVersion: number;
  updatedAt: string;
};

function PageEditForm({
  pageId,
  initialTitle,
  initialContent,
  visibility,
  spaceId,
  currentVersion,
  updatedAt,
}: FormProps) {
  const [title, setTitle] = useState(initialTitle);
  // content 는 저장 시점에만 읽히는 값이라 매 keystroke 의 re-render 비용을 피하려 ref 로 보관한다.
  const contentRef = useRef(initialContent);
  const { mutate, isPending } = usePageUpdate();

  function handleSave() {
    mutate(
      { pageId, body: { title, content: contentRef.current } },
      {
        onError: (mutationError) => {
          if (mutationError.status === 401 && mutationError.code === "INVALID_SESSION") return;
          toast.error(toUserMessage(mutationError));
        },
      },
    );
  }

  const canSave = title.trim() !== "" && !isPending;

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        {/*
        todo    :: visibility 변경 UI 추가 — PageEditRequest 가 visibility 를 받지 않아 별도 endpoint 필요
         author :: crispin
         date   :: 2026-06-04T10:30:00KST
         */}
        <VisibilityBadge visibility={visibility} />
        <span className="text-muted-foreground text-xs">
          v{currentVersion} · {formatPageTimestamp(updatedAt)}
        </span>
      </header>

      <TitleInput
        aria-label="제목"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={isPending}
        placeholder="제목을 입력해 주세요"
      />

      <Editor
        spaceId={spaceId}
        initialContent={initialContent}
        editable={!isPending}
        onChange={(next) => {
          contentRef.current = next;
        }}
      />

      <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
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
      <div className="bg-muted h-5 w-24 animate-pulse rounded" />
      <div className="bg-muted h-10 w-2/3 animate-pulse rounded" />
      <div className="space-y-3">
        <div className="bg-muted h-4 w-full animate-pulse rounded" />
        <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
        <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
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
