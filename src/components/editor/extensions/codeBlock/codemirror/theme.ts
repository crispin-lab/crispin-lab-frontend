import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// 색 단일 출처는 `globals.css` 의 `--syntax-*` 변수 — hljs CSS 와 본 HighlightStyle 이 양쪽에서 참조.
export const codeBlockHighlightStyle = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.controlKeyword,
      t.definitionKeyword,
      t.moduleKeyword,
      t.operatorKeyword,
      t.modifier,
      t.self,
      t.atom,
      t.typeName,
    ],
    color: "var(--syntax-keyword)",
  },
  {
    tag: [
      t.function(t.variableName),
      t.function(t.definition(t.variableName)),
      t.definition(t.variableName),
      t.definition(t.propertyName),
      t.className,
      t.namespace,
    ],
    color: "var(--syntax-title)",
  },
  {
    tag: [
      t.attributeName,
      t.attributeValue,
      t.propertyName,
      t.number,
      t.integer,
      t.float,
      t.bool,
      t.null,
      t.operator,
      t.variableName,
      t.labelName,
      t.color,
      t.unit,
    ],
    color: "var(--syntax-attr)",
  },
  {
    tag: [t.string, t.regexp, t.special(t.string), t.escape, t.character, t.docString],
    color: "var(--syntax-string)",
  },
  {
    tag: [t.function(t.typeName), t.standard(t.variableName), t.macroName],
    color: "var(--syntax-built-in)",
  },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment, t.meta, t.processingInstruction],
    color: "var(--syntax-comment)",
    fontStyle: "italic",
  },
  {
    tag: [t.tagName, t.quote, t.link, t.url],
    color: "var(--syntax-name)",
  },
  {
    tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6],
    color: "var(--syntax-section)",
    fontWeight: "bold",
  },
  { tag: t.list, color: "var(--syntax-bullet)" },
  { tag: t.emphasis, color: "var(--syntax-text)", fontStyle: "italic" },
  { tag: t.strong, color: "var(--syntax-text)", fontWeight: "bold" },
  {
    tag: t.inserted,
    color: "var(--syntax-addition-fg)",
    backgroundColor: "var(--syntax-addition-bg)",
  },
  {
    tag: t.deleted,
    color: "var(--syntax-deletion-fg)",
    backgroundColor: "var(--syntax-deletion-bg)",
  },
  { tag: t.invalid, color: "var(--color-destructive)" },
]);

// gutter / lineNumbers 없음 — 본 NodeView 는 코드 본문만 노출.
export const codeBlockEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--color-foreground)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875rem",
  },
  ".cm-content": {
    padding: "1rem",
    caretColor: "var(--color-foreground)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-foreground)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-line": {
    padding: "0 2px 0 0",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--color-accent) 30%, transparent)",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklch, var(--color-accent) 40%, transparent)",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    overflow: "auto",
  },
});
