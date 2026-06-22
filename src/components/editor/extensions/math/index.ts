import { Mathematics } from "@tiptap/extension-mathematics";

// Mathematics 가 BlockMath + InlineMath 를 내부 등록 — 같은 노드를 또 등록하면 "Duplicate extension names" 경고.
const KATEX_OPTIONS = { throwOnError: false, errorColor: "var(--color-destructive)" } as const;

export function editorMath() {
  return [Mathematics.configure({ katexOptions: KATEX_OPTIONS })];
}
