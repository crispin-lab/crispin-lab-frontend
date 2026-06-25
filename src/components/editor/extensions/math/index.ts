import { Mathematics } from "@tiptap/extension-mathematics";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import { KATEX_BASE_OPTIONS } from "./katex-options";

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
