"use client";

import type { Editor } from "@tiptap/react";
import katex from "katex";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import { commitBlockMathLatex } from "./commit";
import { KATEX_BASE_OPTIONS } from "./katex-options";

export type LatexEditTarget = { pos: number; initialLatex: string };

type Props = {
  editor: Editor;
  target: LatexEditTarget | null;
  onClose: () => void;
};

export function BlockMathLatexPopover({ editor, target, onClose }: Props) {
  function closeAndRestoreFocus() {
    onClose();
    editor.commands.focus();
  }

  function handleOpenChange(open: boolean) {
    if (!open) closeAndRestoreFocus();
  }

  // base-ui 가 매 measurement 마다 anchor 함수를 재호출 — NodeView 가 destroy/recreate 되어도 최신 DOM 을 잡는다.
  // blockMath 노드의 NodeView 는 항상 HTMLElement 로 렌더 (KaTeX wrapper span) — base-ui 의 anchor 가 HTMLElement 만 받아 안전한 lift.
  const anchor =
    target === null ? null : () => editor.view.nodeDOM(target.pos) as HTMLElement | null;

  return (
    <Popover open={target !== null} onOpenChange={handleOpenChange}>
      <PopoverContent
        anchor={anchor}
        side="bottom"
        align="start"
        sideOffset={8}
        className="flex w-80 flex-col gap-2"
      >
        {target !== null && (
          <LatexEditor
            key={`${target.pos}-${target.initialLatex}`}
            editor={editor}
            target={target}
            onClose={closeAndRestoreFocus}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function LatexEditor({
  editor,
  target,
  onClose,
}: {
  editor: Editor;
  target: LatexEditTarget;
  onClose: () => void;
}) {
  const [latex, setLatex] = useState(target.initialLatex);
  const inputId = useId();

  function handleSave() {
    commitBlockMathLatex(editor, target.pos, latex);
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Shift+Enter 는 줄바꿈, Enter 단독은 저장. isComposing 가드로 한국어 IME 자모 확정 Enter 가 save 로 새는 회귀 차단.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSave();
    }
  }

  return (
    <>
      <label htmlFor={inputId} className="text-muted-foreground text-xs font-medium">
        LaTeX
      </label>
      <Textarea
        id={inputId}
        value={latex}
        onChange={(event) => setLatex(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        autoFocus
        className="font-mono text-xs"
      />
      <LatexPreview latex={latex.trim()} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button size="sm" onClick={handleSave}>
          저장
        </Button>
      </div>
    </>
  );
}

function LatexPreview({ latex }: { latex: string }) {
  const html = useMemo(() => {
    if (latex === "") return "";
    return katex.renderToString(latex, {
      ...KATEX_BASE_OPTIONS,
      displayMode: true,
      output: "html",
    });
  }, [latex]);

  if (latex === "") {
    return (
      <p className="text-muted-foreground text-xs">
        수식이 비어 있습니다 — 저장 시 노드가 삭제됩니다.
      </p>
    );
  }
  // dangerouslySetInnerHTML 안전: katex-options.ts 의 `trust: false` 가 raw HTML 차단 + `throwOnError: false` 라 error 도 escape 된 span.
  return (
    <div
      aria-label="미리보기"
      className="overflow-x-auto text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
