"use client";

import { notFound } from "next/navigation";
import { useRef, useState } from "react";

import { Editor } from "@/components/editor/Editor";
import { TitleInput } from "@/components/page/TitleInput";
import { VisibilitySelect } from "@/components/page/VisibilitySelect";
import { Button } from "@/components/ui/button";
import { usePage, usePageUpdate } from "@/hooks/usePage";
import { ApiError } from "@/lib/api/client";
import { type PageId, type SpaceId, asSpaceId } from "@/lib/api/ids";
import { toUserMessage } from "@/lib/api/errors";
import { type Visibility, isVisibility } from "@/lib/page/visibility";

type Props = {
  pageId: PageId;
};

export function PageEditView({ pageId }: Props) {
  const { data: page, isPending, isError, error } = usePage(pageId);

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
  if (process.env.NODE_ENV !== "production" && !isVisibility(rawVisibility)) {
    console.warn(`알 수 없는 visibility 값 (${rawVisibility}) — DRAFT 로 폴백`);
  }

  return (
    <PageEditForm
      pageId={pageId}
      initialTitle={page.title}
      initialContent={page.content}
      initialVisibility={initialVisibility}
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
  initialVisibility: Visibility;
  spaceId: SpaceId;
  currentVersion: number;
  updatedAt: string;
};

function PageEditForm({
  pageId,
  initialTitle,
  initialContent,
  initialVisibility,
  spaceId,
  currentVersion,
  updatedAt,
}: FormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [visibility, setVisibility] = useState(initialVisibility);
  // content 는 저장 시점에만 읽히는 값이라 매 keystroke 의 re-render 비용을 피하려 ref 로 보관한다.
  const contentRef = useRef(initialContent);
  const { mutate, isPending } = usePageUpdate();

  function handleSave() {
    mutate({ pageId, body: { title, content: contentRef.current, visibility } });
  }

  const canSave = title.trim() !== "" && !isPending;

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <VisibilitySelect value={visibility} onValueChange={setVisibility} disabled={isPending} />
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
        sourceVisibility={visibility}
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
