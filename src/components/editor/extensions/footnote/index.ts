import { FootnoteItem } from "./item";
import { FootnoteList } from "./list";
import { FootnoteNumbering } from "./numbering";
import { FootnoteItemPlaceholder } from "./placeholder";
import { FootnoteReference } from "./reference";
import { FootnoteSync } from "./sync";

// Tiptap 은 plugin 수집 시 extensions 를 역순 순회 — 배열 뒤쪽이 PM 에 먼저 등록되어 먼저 fire.
// sync 를 numbering 뒤에 둬야 sync → numbering 순으로 돈다.
export function editorFootnote() {
  return [
    FootnoteReference,
    FootnoteItem,
    FootnoteList,
    FootnoteItemPlaceholder,
    FootnoteNumbering,
    FootnoteSync,
  ];
}
