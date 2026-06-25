import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

// 새 footnoteItem 을 마지막 top-level footnoteList 안의 `ordinal` 자리에 insert — list 가 없으면 list 자체를 생성.
// ordinal 은 새 reference 의 doc-order 인덱스: numbering plugin 이 ref / item 을 각각 doc 순서로 재할당하므로 같은 자리에 넣어야 짝이 맞는다.
// type 으로 list 를 찾는 이유: trailingNode 가 list 뒤에 paragraph 를 두면 `doc.lastChild` 가 paragraph 가 되어 매번 새 list 가 생긴다.
export function appendFootnoteItem(
  tr: Transaction,
  schema: Schema,
  ordinal: number = Number.POSITIVE_INFINITY,
): { itemParagraphPos: number } | null {
  const itemType = schema.nodes.footnoteItem;
  const listType = schema.nodes.footnoteList;
  const paragraphType = schema.nodes.paragraph;
  if (itemType === undefined || listType === undefined || paragraphType === undefined) {
    return null;
  }

  const newItem = itemType.create({ number: 1 }, paragraphType.create());
  const doc = tr.doc;

  // forEach 콜백 안의 재할당을 TS narrow 가 추적 못해 `as` 가 강제되는 패턴을 피하려고 array 누적.
  const lists: Array<{ node: PMNode; pos: number }> = [];
  doc.forEach((node, offset) => {
    if (node.type === listType) {
      lists.push({ node, pos: offset });
    }
  });
  const last = lists[lists.length - 1];

  if (last !== undefined) {
    const clamped = Math.min(Math.max(ordinal, 0), last.node.childCount);
    let insertPos = last.pos + 1;
    for (let i = 0; i < clamped; i += 1) {
      insertPos += last.node.child(i).nodeSize;
    }
    tr.insert(insertPos, newItem);
    // insertPos = item open → +1 item 내부 → +1 paragraph 내부.
    return { itemParagraphPos: insertPos + 2 };
  }

  const newList = listType.create(null, newItem);
  const insertPos = doc.content.size;
  tr.insert(insertPos, newList);
  // insertPos = list open → +1 list 내부 → +1 item 내부 → +1 paragraph 내부.
  return { itemParagraphPos: insertPos + 3 };
}
