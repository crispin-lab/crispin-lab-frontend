import { FootnoteItem } from "./item";
import { FootnoteList } from "./list";
import { FootnoteReference } from "./reference";

// numbering plugin 없이 — 저장된 number attr 가 이미 editor 측 plugin 의 결과.
export const viewerFootnote = [FootnoteReference, FootnoteItem, FootnoteList];
