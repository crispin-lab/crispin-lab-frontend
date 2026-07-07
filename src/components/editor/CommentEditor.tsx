"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

import type { SpaceId } from "@/lib/api/ids";
import { parseEditorContent, serializeEditorContent } from "@/lib/editor/content";
import type { Visibility } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

import { editorMention } from "./extensions/mention";
import { editorPageLink } from "./extensions/pageLink";

type Props = {
  spaceId: SpaceId;
  sourceVisibility: Visibility;
  initialContent?: string;
  onChange?: (content: string, isEmpty: boolean) => void;
  onSubmitShortcut?: () => void;
  editable?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

export function handleCommentEditorKeyDown(
  event: KeyboardEvent,
  onSubmitShortcut: (() => void) | undefined,
): boolean {
  if (event.key !== "Enter") return false;
  if (event.isComposing) return false;
  if (event.shiftKey) return false;
  if (onSubmitShortcut === undefined) return false;
  event.preventDefault();
  onSubmitShortcut();
  return true;
}

// 본문 에디터의 축소판. 댓글 길이 / 빈도를 고려해 무거운 확장 (CodeMirror codeBlock, table, math,
// footnote, callout, details, taskList, slashMenu) 은 제외. StarterKit + PageLink + Placeholder 만.
// BubbleMenu 도 의도적으로 제외 — 댓글 단축 텍스트 컨텍스트에서 mark toolbar 의 시각 노이즈가 본문 reading 분위기를 깬다.
export function CommentEditor({
  spaceId,
  sourceVisibility,
  initialContent,
  onChange,
  onSubmitShortcut,
  editable = true,
  placeholder,
  autoFocus = false,
  className,
}: Props) {
  const sourceVisibilityRef = useRef<Visibility>(sourceVisibility);
  const refreshSuggestionRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    sourceVisibilityRef.current = sourceVisibility;
    refreshSuggestionRef.current?.();
  }, [sourceVisibility]);

  const onSubmitShortcutRef = useRef(onSubmitShortcut);
  useEffect(() => {
    onSubmitShortcutRef.current = onSubmitShortcut;
  }, [onSubmitShortcut]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      // ref 들은 suggestion 트리거 시점 (mount 이후) 에 호출되며 render 중에는 읽히지 않는다.
      // eslint-disable-next-line react-hooks/refs
      editorPageLink({
        spaceId,
        getSourceVisibility: () => sourceVisibilityRef.current,
        onRefreshAvailable: (refresh) => {
          refreshSuggestionRef.current = refresh;
        },
      }),
      editorMention(),
      ...(placeholder !== undefined ? [Placeholder.configure({ placeholder })] : []),
    ],
    content: parseEditorContent(initialContent),
    editable,
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(
          "prose-editor min-h-20 leading-7 outline-none",
          "[&_p]:my-2",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-1",
        ),
        "aria-label": placeholder ?? "댓글 본문",
      },
      handleKeyDown: (_view, event) =>
        handleCommentEditorKeyDown(event, onSubmitShortcutRef.current),
    },
    onUpdate: ({ editor }) => {
      onChange?.(serializeEditorContent(editor.getJSON()), editor.isEmpty);
    },
  });

  return (
    <div
      className={cn(
        "border-input bg-background w-full rounded-md border px-3 py-2 transition-shadow duration-150 ease-out",
        "focus-within:shadow-[inset_0_0_0_1px_var(--color-ring)]",
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
