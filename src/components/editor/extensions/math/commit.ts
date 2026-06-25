import type { Editor } from "@tiptap/react";

// 빈 latex 으로 저장 = "수식 제거" 의도 → 노드 자체 삭제. Mod-z 로 복구 가능.
// pos 가 popover 열린 동안 외부 doc 변경 (자동 저장 등) 으로 stale 될 가능성 — node type 가드 한 줄로 잘못된 노드 update / delete 차단.
export function commitBlockMathLatex(editor: Editor, pos: number, rawLatex: string): void {
  const node = editor.state.doc.nodeAt(pos);
  if (node === null || node.type.name !== "blockMath") return;

  const trimmed = rawLatex.trim();
  if (trimmed === "") {
    editor.chain().focus().deleteBlockMath({ pos }).run();
    return;
  }
  editor.chain().focus().updateBlockMath({ latex: trimmed, pos }).run();
}
