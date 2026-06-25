import type { Editor } from "@tiptap/react";

// 빈 latex 으로 저장 = "수식 제거" 의도 → 노드 자체 삭제. Mod-z 로 복구 가능.
export function commitBlockMathLatex(editor: Editor, pos: number, rawLatex: string): void {
  const trimmed = rawLatex.trim();
  if (trimmed === "") {
    editor.chain().focus().deleteBlockMath({ pos }).run();
    return;
  }
  editor.chain().focus().updateBlockMath({ latex: trimmed, pos }).run();
}
