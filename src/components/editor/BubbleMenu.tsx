"use client";

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
      className="border-border bg-popover text-popover-foreground flex items-center gap-1 rounded-md border p-1 shadow-md"
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
