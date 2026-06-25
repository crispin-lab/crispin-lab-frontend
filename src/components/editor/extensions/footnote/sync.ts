import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { appendFootnoteItem } from "./appendItem";

type RefHit = { number: number };
type ItemHit = {
  number: number;
  pos: number;
  parentListPos: number;
  parentListChildCount: number;
};

// numbering 보다 먼저 fire 되어야 cascade 가 stale number 로 올바른 짝 item 을 식별 — 순서 깨지면 콘텐츠 misalign.
export const FootnoteSyncKey = new PluginKey("footnoteSync");

export const FootnoteSync = Extension.create({
  name: "footnoteSync",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: FootnoteSyncKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const refs: RefHit[] = [];
          const items: ItemHit[] = [];
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "footnoteReference") {
              const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
              refs.push({ number });
              return false;
            }
            if (node.type.name === "footnoteItem") {
              const $pos = newState.doc.resolve(pos);
              const parent = $pos.parent;
              if (parent.type.name !== "footnoteList") return true;
              const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
              items.push({
                number,
                pos,
                parentListPos: $pos.before(),
                parentListChildCount: parent.childCount,
              });
            }
            return true;
          });

          const refNumberSet = new Set(refs.map((r) => r.number));
          const itemNumberSet = new Set(items.map((i) => i.number));

          const orphanItems = items.filter((i) => !refNumberSet.has(i.number));
          // 같은 number 의 ref 가 둘이어도 missing 은 한 번만 생성하면 numbering 이 doc-order 로 재할당하며 짝을 맞춤.
          const missingNumbers = [
            ...new Set(refs.map((r) => r.number).filter((n) => !itemNumberSet.has(n))),
          ];

          if (orphanItems.length === 0 && missingNumbers.length === 0) return null;

          // 같은 list 의 모든 item 이 orphan 이면 개별 item 삭제가 아니라 list 자체 삭제로 승격 — 빈 list 는
          // schema "footnoteItem+" 를 위반.
          const orphansByList = new Map<number, ItemHit[]>();
          for (const item of orphanItems) {
            const bucket = orphansByList.get(item.parentListPos) ?? [];
            bucket.push(item);
            orphansByList.set(item.parentListPos, bucket);
          }

          type DeleteRange = { from: number; to: number };
          const deletions: DeleteRange[] = [];
          const listsBeingDeletedWholly = new Set<number>();

          for (const [listPos, orphansInList] of orphansByList) {
            if (orphansInList.length !== orphansInList[0].parentListChildCount) continue;
            const listNode = newState.doc.nodeAt(listPos);
            if (listNode === null) continue;
            deletions.push({ from: listPos, to: listPos + listNode.nodeSize });
            listsBeingDeletedWholly.add(listPos);
          }

          for (const orphan of orphanItems) {
            if (listsBeingDeletedWholly.has(orphan.parentListPos)) continue;
            const itemNode = newState.doc.nodeAt(orphan.pos);
            if (itemNode === null) continue;
            deletions.push({ from: orphan.pos, to: orphan.pos + itemNode.nodeSize });
          }

          // 큰 position 부터 — 이전 position 이 delete 의 영향을 받지 않게.
          deletions.sort((a, b) => b.from - a.from);

          const tr = newState.tr;
          for (const range of deletions) {
            tr.delete(range.from, range.to);
          }

          // 보충: missing 큰 number 부터 — 작은 ordinal 의 insert 가 큰 ordinal 의 위치를 흔들지 않음.
          // ordinal 은 살아남는 (= 삭제 대상이 아닌) item 중 number < missing 인 개수.
          const survivingItems = items.filter((i) => refNumberSet.has(i.number));
          const missingDesc = [...missingNumbers].sort((a, b) => b - a);
          for (const missing of missingDesc) {
            const ordinal = survivingItems.filter((i) => i.number < missing).length;
            appendFootnoteItem(tr, newState.schema, ordinal);
          }

          return tr.steps.length > 0 ? tr : null;
        },
      }),
    ];
  },
});
