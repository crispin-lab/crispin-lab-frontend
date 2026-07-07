"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CommentEditor } from "@/components/editor/CommentEditor";
import { useCommentRegister } from "@/hooks/useComment";
import { toUserMessage } from "@/lib/api/errors";
import type { PageId, SpaceId } from "@/lib/api/ids";
import type { Visibility } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  pageId: PageId;
  spaceId: SpaceId;
  sourceVisibility: Visibility;
  className?: string;
};

export function CommentComposeForm({ pageId, spaceId, sourceVisibility, className }: Props) {
  const [content, setContent] = useState<string>("");
  const [isEmpty, setIsEmpty] = useState<boolean>(true);
  // editorKey 로 mount 를 강제 reset — 등록 성공 후 controlled state 만 비우면 ProseMirror 의 내부 doc 이 유지된다.
  const [editorKey, setEditorKey] = useState<number>(0);
  const { mutate, isPending, error, reset } = useCommentRegister(pageId);

  function handleSubmit() {
    if (isEmpty || isPending) return;
    mutate(
      { content },
      {
        onSuccess: () => {
          setContent("");
          setIsEmpty(true);
          setEditorKey((n) => n + 1);
        },
      },
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <CommentEditor
        key={editorKey}
        spaceId={spaceId}
        sourceVisibility={sourceVisibility}
        placeholder="댓글을 남겨 보세요."
        onChange={(next, empty) => {
          setContent(next);
          setIsEmpty(empty);
          if (error !== null) reset();
        }}
        onSubmitShortcut={handleSubmit}
      />
      {error !== null && (
        <p role="alert" className="text-destructive text-sm">
          {toUserMessage(error)}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">Enter 로 등록 · Shift+Enter 로 줄바꿈</p>
        <Button type="submit" disabled={isEmpty || isPending} size="sm">
          {isPending ? "등록 중…" : "등록"}
        </Button>
      </div>
    </form>
  );
}
