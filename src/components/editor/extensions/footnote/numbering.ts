import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

type RefHit = { pos: number; current: number };

// reference / item 의 number 를 문서 순서대로 재할당.
// 무한 루프 방어: desired == current 면 setNodeMarkup 호출 안 함 → tr.steps.length 0 → null 반환으로 자연 수렴.
export const FootnoteNumberingKey = new PluginKey("footnoteNumbering");

export const FootnoteNumbering = Extension.create({
  name: "footnoteNumbering",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: FootnoteNumberingKey,
        appendTransaction(transactions, _oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const refs: RefHit[] = [];
          const items: RefHit[] = [];
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "footnoteReference") {
              const current = typeof node.attrs.number === "number" ? node.attrs.number : 0;
              refs.push({ pos, current });
            } else if (node.type.name === "footnoteItem") {
              const current = typeof node.attrs.number === "number" ? node.attrs.number : 0;
              items.push({ pos, current });
            }
            return true;
          });

          if (refs.length === 0 && items.length === 0) return null;

          const tr = newState.tr;
          assignNumbers(refs, newState.doc, (pos, attrs, number) => {
            tr.setNodeMarkup(pos, undefined, { ...attrs, number });
          });
          assignNumbers(items, newState.doc, (pos, attrs, number) => {
            tr.setNodeMarkup(pos, undefined, { ...attrs, number });
          });
          return tr.steps.length > 0 ? tr : null;
        },
      }),
    ];
  },
});

function assignNumbers(
  hits: RefHit[],
  doc: PMNode,
  apply: (pos: number, attrs: Record<string, unknown>, number: number) => void,
) {
  hits.forEach((hit, idx) => {
    const desired = idx + 1;
    if (hit.current === desired) return;
    const node = doc.nodeAt(hit.pos);
    if (!node) return;
    apply(hit.pos, node.attrs, desired);
  });
}
