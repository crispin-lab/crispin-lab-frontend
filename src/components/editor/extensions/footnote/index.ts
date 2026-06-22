import { FootnoteItem } from "./item";
import { FootnoteList } from "./list";
import { FootnoteNumbering } from "./numbering";
import { FootnoteReference } from "./reference";

// numbering plugin 은 editor 만 — viewer 는 transaction 없음.
export function editorFootnote() {
  return [FootnoteReference, FootnoteItem, FootnoteList, FootnoteNumbering];
}
