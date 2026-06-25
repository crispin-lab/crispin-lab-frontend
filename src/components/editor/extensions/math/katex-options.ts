// editor (NodeView + LatexPopover 미리보기) 와 viewer (KatexMounter) 가 공유하는 KaTeX 옵션 단일 출처.
// `trust: false` 를 명시 — \href / \includegraphics / \html* 같은 raw HTML 명령이 차단되어 popover / mounter 의 dangerouslySetInnerHTML 이 안전. lib upgrade 의 default 변경에도 영향받지 않게 옵션으로 박는다.
export const KATEX_BASE_OPTIONS = {
  throwOnError: false,
  errorColor: "var(--color-destructive)",
  trust: false,
} as const;
