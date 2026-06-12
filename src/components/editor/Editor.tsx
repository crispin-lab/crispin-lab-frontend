"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";

import type { SpaceId } from "@/lib/api/ids";
import { parseEditorContent, serializeEditorContent } from "@/lib/editor/content";
import type { Visibility } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

import { EditorBubbleMenu } from "./BubbleMenu";
import { editorExtensions } from "./extensions/editor";

type Props = {
  spaceId: SpaceId;
  sourceVisibility: Visibility;
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
};

export function Editor({
  spaceId,
  sourceVisibility,
  initialContent,
  onChange,
  editable = true,
  placeholder,
  className,
}: Props) {
  // useEditor 의 extensions 는 mount 시 한 번만 capture 된다. parent 의 visibility 변경이 같은 editor 인스턴스에
  // 반영되도록 ref 로 우회한다 — 재마운트 시 본문 손실 회피.
  const sourceVisibilityRef = useRef<Visibility>(sourceVisibility);
  // popup 이 이미 열린 상태에서 visibility 가 토글되면 suggestion 라이프사이클이 트리거되지 않아 chip / tooltip 이
  // stale 해진다. extension 이 등록한 refresh 콜백을 호출해 active MentionList 의 props 를 강제 갱신한다.
  const refreshSuggestionRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    sourceVisibilityRef.current = sourceVisibility;
    refreshSuggestionRef.current?.();
  }, [sourceVisibility]);

  const editor = useEditor({
    // ref 들은 suggestion 트리거 시점 (mount 이후) 에 호출되며 render 중에는 읽히지 않는다.
    // eslint-disable-next-line react-hooks/refs
    extensions: editorExtensions({
      spaceId,
      getSourceVisibility: () => sourceVisibilityRef.current,
      onRefreshAvailable: (refresh) => {
        refreshSuggestionRef.current = refresh;
      },
    }),
    content: parseEditorContent(initialContent),
    editable,
    // App Router SSR 에서 ProseMirror 초기 마운트가 hydration mismatch 를 일으키지 않도록 클라이언트 마운트 이후로 미룬다.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // inline-code / blockquote / hr 스타일은 code-highlight.css 의 `.prose-editor ...` 셀렉터에서 담당 (reading 과 공유).
        class: cn(
          "prose-editor min-h-64 leading-8 outline-none",
          "[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:bg-gradient-to-r [&_h1]:from-(--heading-gradient-start) [&_h1]:to-(--heading-gradient-end) [&_h1]:bg-clip-text [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-transparent",
          "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold",
          "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
          "[&_p]:my-3",
          "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-1 [&_a]:transition-all [&_a]:duration-200 [&_a]:ease-out",
          "[&_a:hover]:underline-offset-4 [&_a:hover]:decoration-2",
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
    <div
      className={cn(
        "w-full rounded-md transition-shadow duration-150 ease-out",
        "focus-within:shadow-[inset_0_0_0_1px_var(--color-ring)]",
        className,
      )}
    >
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
