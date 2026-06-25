// editor (NodeView + LatexPopover) 와 viewer (KatexMounter) 가 공유하는 KaTeX 옵션 단일 출처.
// `trust: false` 명시 — raw HTML 명령 (\href / \includegraphics / \html*) 차단으로 dangerouslySetInnerHTML 안전. lib upgrade 의 default 변경에도 보장.
export const KATEX_BASE_OPTIONS = {
  throwOnError: false,
  errorColor: "var(--color-destructive)",
  trust: false,
} as const;
