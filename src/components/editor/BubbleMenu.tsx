"use client";

import { isTextSelection } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { BoldIcon, CodeIcon, HeadingIcon, ItalicIcon, StrikethroughIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  editor: Editor | null;
};

export function EditorBubbleMenu({ editor }: Props) {
  if (!editor) return null;

  return (
    <TiptapBubbleMenu
      editor={editor}
      // 표 안 + CellSelection 은 TableToolbar 의 영역 — 두 toolbar 동시 노출 회피의 대칭 가드.
      // 그 외는 extension-bubble-menu 의 default shouldShow 동작 복원 (read-only / empty / emptyTextBlock 제외).
      shouldShow={({ editor, state, from, to }) => {
        const { selection } = state;
        if (selection.empty) return false;
        if (editor.isActive("table") && selection instanceof CellSelection) return false;
        if (!editor.isEditable) return false;
        const isEmptyTextBlock =
          !state.doc.textBetween(from, to).length && isTextSelection(selection);
        return !isEmptyTextBlock;
      }}
      className="border-border bg-surface-elevated text-popover-foreground shadow-accent-glow flex items-center gap-1 rounded-md border p-1"
    >
      <BubbleButton
        ariaLabel="굵게"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-4" />
      </BubbleButton>
      <BubbleButton
        ariaLabel="기울임"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="size-4" />
      </BubbleButton>
      <BubbleButton
        ariaLabel="취소선"
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon className="size-4" />
      </BubbleButton>
      <BubbleButton
        ariaLabel="인라인 코드"
        isActive={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <CodeIcon className="size-4" />
      </BubbleButton>
      <BubbleButton
        ariaLabel="제목 2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <HeadingIcon className="size-4" />
      </BubbleButton>
    </TiptapBubbleMenu>
  );
}

function BubbleButton({
  children,
  ariaLabel,
  isActive,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded text-sm",
        isActive && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}
