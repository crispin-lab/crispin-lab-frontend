"use client";

import { EditorContent, useEditor } from "@tiptap/react";

import type { SpaceId } from "@/lib/api/ids";
import { parseEditorContent, serializeEditorContent } from "@/lib/editor/content";
import { cn } from "@/lib/utils";

import { EditorBubbleMenu } from "./BubbleMenu";
import { editorExtensions } from "./extensions/editor";

type Props = {
  spaceId: SpaceId;
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
};

export function Editor({
  spaceId,
  initialContent,
  onChange,
  editable = true,
  placeholder,
  className,
}: Props) {
  const editor = useEditor({
    extensions: editorExtensions({ spaceId }),
    content: parseEditorContent(initialContent),
    editable,
    // App Router SSR 에서 ProseMirror 초기 마운트가 hydration mismatch 를 일으키지 않도록 클라이언트 마운트 이후로 미룬다.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // inline-code 스타일은 code-highlight.css 의 `.prose-editor :not(pre) > code` 에서 담당.
        class: cn(
          "prose-editor min-h-64 leading-7 outline-none",
          "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-semibold",
          "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-semibold",
          "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
          "[&_p]:my-2",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_a]:text-accent [&_a]:underline",
        ),
        "aria-label": placeholder ?? "본문",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(serializeEditorContent(editor.getJSON()));
    },
  });

  return (
    <div className={cn("w-full", className)}>
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
