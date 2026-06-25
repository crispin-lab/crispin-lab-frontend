import { mergeAttributes } from "@tiptap/core";

import { FootnoteItem } from "./item";
import { FootnoteList } from "./list";
import { FootnoteNumbering } from "./numbering";
import { FootnoteReference } from "./reference";
import { FootnoteSync } from "./sync";

// editor 전용 — viewer 정적 HTML 에 data-placeholder 가 새지 않게 base spec (item.ts) 에는 박지 않고 여기서만 override.
const EditorFootnoteItem = FootnoteItem.extend({
  renderHTML({ node, HTMLAttributes }) {
    const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-item": "",
        "data-placeholder": "각주 내용을 입력하세요",
        id: `fn-${number}`,
        class: "footnote-item",
        role: "doc-footnote",
      }),
      0,
    ];
  },
});

// Tiptap 은 plugin 수집 시 extensions 를 역순 순회 — 배열 뒤쪽이 PM 에 먼저 등록되어 먼저 fire.
// sync 를 numbering 뒤에 둬야 sync → numbering 순으로 돈다.
export function editorFootnote() {
  return [FootnoteReference, EditorFootnoteItem, FootnoteList, FootnoteNumbering, FootnoteSync];
}
