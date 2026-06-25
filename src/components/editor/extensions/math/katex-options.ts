// editor (NodeView + LatexPopover 미리보기) 와 viewer (KatexMounter) 가 공유하는 KaTeX 옵션 단일 출처 — 미리보기 = 실제 결과 신뢰.
// `trust` 는 기본 false 유지 — \href / \includegraphics / \html* 같은 raw HTML 명령이 차단되어 popover / mounter 의 dangerouslySetInnerHTML 안전. 변경 시 보안 검토 필수.
export const KATEX_BASE_OPTIONS = {
  throwOnError: false,
  errorColor: "var(--color-destructive)",
} as const;
