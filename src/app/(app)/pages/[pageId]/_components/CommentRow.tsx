"use client";

import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { useMemo, useState } from "react";

import { FormattedTime } from "@/components/common/FormattedTime";
import { Button } from "@/components/ui/button";
import { CommentEditor } from "@/components/editor/CommentEditor";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { viewerExtensions } from "@/components/editor/extensions/viewer";
import { UserHandleLabel } from "@/components/UserHandleLabel";
import { useCommentDelete, useCommentEdit } from "@/hooks/useComment";
import { toUserMessage } from "@/lib/api/errors";
import { asCommentId, type CommentId, type PageId, type SpaceId } from "@/lib/api/ids";
import type { CommentSummary } from "@/lib/api/types";
import {
  isEmptyEditorContent,
  parseEditorContent,
  serializeEditorContent,
} from "@/lib/editor/content";
import type { Visibility } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  comment: CommentSummary;
  pageId: PageId;
  spaceId: SpaceId;
  sourceVisibility: Visibility;
};

export function CommentRow({ comment, pageId, spaceId, sourceVisibility }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const commentId = asCommentId(comment.commentId);
  const deleteMutation = useCommentDelete(pageId);

  function handleDeleteConfirm() {
    deleteMutation.mutate(commentId, {
      onSuccess: () => setDeleteOpen(false),
    });
  }

  return (
    <li className="py-4">
      <header className="text-muted-foreground mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <UserHandleLabel handle={comment.authorHandle} />
        <span aria-hidden>·</span>
        <FormattedTime iso={comment.createdAt} variant="datetime" />
        {comment.updatedAt !== comment.createdAt && (
          <>
            <span aria-hidden>·</span>
            <span>
              수정 <FormattedTime iso={comment.updatedAt} variant="datetime" />
            </span>
          </>
        )}
        {comment.canEdit && !isEditing && (
          <span className="ml-auto flex items-center gap-1">
            <Button type="button" variant="ghost" size="xs" onClick={() => setIsEditing(true)}>
              편집
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => setDeleteOpen(true)}>
              삭제
            </Button>
          </span>
        )}
      </header>

      {isEditing ? (
        <CommentEditForm
          pageId={pageId}
          commentId={commentId}
          spaceId={spaceId}
          sourceVisibility={sourceVisibility}
          initialContent={comment.content}
          onClose={() => setIsEditing(false)}
        />
      ) : (
        <CommentBody content={comment.content} />
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          setDeleteOpen(next);
          if (!next && deleteMutation.error !== null) deleteMutation.reset();
        }}
        title="댓글을 삭제할까요?"
        description="댓글이 삭제됩니다. 되돌릴 수 없습니다."
        isPending={deleteMutation.isPending}
        errorMessage={deleteMutation.error !== null ? toUserMessage(deleteMutation.error) : null}
        onConfirm={handleDeleteConfirm}
      />
    </li>
  );
}

function CommentBody({ content }: { content: string }) {
  const html = useMemo(() => {
    const doc = parseEditorContent(content);
    return renderToHTMLString({ content: doc, extensions: viewerExtensions });
  }, [content]);

  return (
    <div
      className={cn(
        "prose-page text-sm leading-7",
        "[&_p]:my-2",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_a]:text-accent [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-2",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type EditFormProps = {
  pageId: PageId;
  commentId: CommentId;
  spaceId: SpaceId;
  sourceVisibility: Visibility;
  initialContent: string;
  onClose: () => void;
};

function CommentEditForm({
  pageId,
  commentId,
  spaceId,
  sourceVisibility,
  initialContent,
  onClose,
}: EditFormProps) {
  // 초기 isEmpty 는 normalize 된 doc 기준 — raw initialContent 가 손상이어도 빈 PUT 으로 흐르지 않는다.
  const initialDoc = parseEditorContent(initialContent);
  const initialSerialized = serializeEditorContent(initialDoc);
  const [content, setContent] = useState<string>(initialSerialized);
  const [isEmpty, setIsEmpty] = useState<boolean>(isEmptyEditorContent(initialDoc));
  const { mutate, isPending, error, reset } = useCommentEdit(pageId, commentId);

  function handleSave() {
    if (isEmpty || isPending) return;
    mutate({ content }, { onSuccess: onClose });
  }

  return (
    <div className="flex flex-col gap-2">
      <CommentEditor
        spaceId={spaceId}
        sourceVisibility={sourceVisibility}
        initialContent={initialSerialized}
        autoFocus
        onChange={(next, empty) => {
          setContent(next);
          setIsEmpty(empty);
          if (error !== null) reset();
        }}
        onSubmitShortcut={handleSave}
      />
      {error !== null && (
        <p role="alert" className="text-destructive text-sm">
          {toUserMessage(error)}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
          취소
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={isEmpty || isPending}>
          {isPending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}
