import { Mathematics } from "@tiptap/extension-mathematics";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import { KATEX_BASE_OPTIONS } from "./katex-options";

// Mathematics 가 BlockMath + InlineMath 를 내부 등록 — 같은 노드를 또 등록하면 "Duplicate extension names" 경고.

export type EditorMathOptions = {
  onBlockClick?: (node: ProseMirrorNode, pos: number) => void;
};

export function editorMath({ onBlockClick }: EditorMathOptions = {}) {
  return [
    Mathematics.configure({
      katexOptions: KATEX_BASE_OPTIONS,
      blockOptions: { onClick: onBlockClick },
    }),
  ];
}
