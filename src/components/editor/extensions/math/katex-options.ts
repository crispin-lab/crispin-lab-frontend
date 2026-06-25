// editor 의 NodeView 와 LatexPopover 의 미리보기가 같은 KaTeX 동작을 공유 — 미리보기 = 실제 결과 신뢰.
export const KATEX_BASE_OPTIONS = {
  throwOnError: false,
  errorColor: "var(--color-destructive)",
} as const;
