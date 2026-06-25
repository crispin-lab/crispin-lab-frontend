import { Extension } from "@tiptap/core";
import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";

import { appendFootnoteItem } from "./appendItem";

type RefHit = { number: number };
type ItemHit = {
  number: number;
  pos: number;
  node: PMNode;
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
          const emptyListPositions: number[] = [];
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "footnoteReference") {
              const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
              refs.push({ number });
              return false;
            }
            if (node.type.name === "footnoteList") {
              if (node.childCount === 0) emptyListPositions.push(pos);
              return true;
            }
            if (node.type.name === "footnoteItem") {
              const $pos = newState.doc.resolve(pos);
              const parent = $pos.parent;
              if (parent.type.name !== "footnoteList") return true;
              const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
              items.push({
                number,
                pos,
                node,
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

          if (
            orphanItems.length === 0 &&
            missingNumbers.length === 0 &&
            emptyListPositions.length === 0
          ) {
            return null;
          }

          // 같은 list 의 모든 item 이 orphan 이면 개별 item 삭제가 아니라 list 자체 삭제로 승격 — 빈 list 는
          // schema "footnoteItem+" 를 위반. 사용자 액션 결과 처음부터 비어 있는 list 도 같은 이유로 cleanup.
          const orphansByList = new Map<number, ItemHit[]>();
          for (const item of orphanItems) {
            const bucket = orphansByList.get(item.parentListPos) ?? [];
            bucket.push(item);
            orphansByList.set(item.parentListPos, bucket);
          }

          type DeleteRange = { from: number; to: number };
          const deletions: DeleteRange[] = [];
          const listsBeingDeletedWholly = new Set<number>();

          for (const listPos of emptyListPositions) {
            const listNode = newState.doc.nodeAt(listPos);
            if (listNode === null) continue;
            deletions.push({ from: listPos, to: listPos + listNode.nodeSize });
            listsBeingDeletedWholly.add(listPos);
          }

          for (const [listPos, orphansInList] of orphansByList) {
            if (listsBeingDeletedWholly.has(listPos)) continue;
            if (orphansInList.length !== orphansInList[0].parentListChildCount) continue;
            const listNode = newState.doc.nodeAt(listPos);
            if (listNode === null) continue;
            deletions.push({ from: listPos, to: listPos + listNode.nodeSize });
            listsBeingDeletedWholly.add(listPos);
          }

          for (const orphan of orphanItems) {
            if (listsBeingDeletedWholly.has(orphan.parentListPos)) continue;
            deletions.push({ from: orphan.pos, to: orphan.pos + orphan.node.nodeSize });
          }

          // 큰 position 부터 — 이전 position 이 delete 의 영향을 받지 않게.
          deletions.sort((a, b) => b.from - a.from);

          const tr = newState.tr;
          for (const range of deletions) {
            tr.delete(range.from, range.to);
          }

          // 보충: 짝인 list 의 정확한 자리에 insert — predecessor (가장 큰 number < missing) *뒤*, 없으면
          // successor (가장 작은 number > missing) *앞*. 다중 list 에서도 같은 list 안에서 짝이 유지된다
          // (appendFootnoteItem 가 마지막 list 만 보던 회귀를 피한다). 인접 survivor 가 없으면 doc 에 list 가
          // 사라진 상태라 appendFootnoteItem 으로 새 list 까지 동봉 생성.
          // missing 큰 number 부터 처리해 tr.mapping 이 누적되어도 predecessor 의 mapped position 이 안정.
          const survivingItems = items.filter((i) => refNumberSet.has(i.number));
          const missingDesc = [...missingNumbers].sort((a, b) => b - a);
          for (const missing of missingDesc) {
            const predecessor = pickByNumber(survivingItems, missing, "predecessor");
            const successor = pickByNumber(survivingItems, missing, "successor");

            let insertPos: number | null = null;
            if (predecessor !== null) {
              insertPos = tr.mapping.map(predecessor.pos) + predecessor.node.nodeSize;
            } else if (successor !== null) {
              insertPos = tr.mapping.map(successor.pos);
            }

            if (insertPos !== null) {
              insertEmptyFootnoteItem(tr, newState.schema, insertPos);
            } else {
              appendFootnoteItem(tr, newState.schema, 0);
            }
          }

          return tr.steps.length > 0 ? tr : null;
        },
      }),
    ];
  },
});

function pickByNumber(
  items: ItemHit[],
  pivot: number,
  side: "predecessor" | "successor",
): ItemHit | null {
  const filtered = items.filter((i) =>
    side === "predecessor" ? i.number < pivot : i.number > pivot,
  );
  if (filtered.length === 0) return null;
  return filtered.reduce((best, cur) => {
    if (side === "predecessor") return cur.number > best.number ? cur : best;
    return cur.number < best.number ? cur : best;
  });
}

function insertEmptyFootnoteItem(tr: Transaction, schema: Schema, insertPos: number): void {
  const itemType = schema.nodes.footnoteItem;
  const paragraphType = schema.nodes.paragraph;
  if (itemType === undefined || paragraphType === undefined) return;
  tr.insert(insertPos, itemType.create({ number: 1 }, paragraphType.create()));
}
