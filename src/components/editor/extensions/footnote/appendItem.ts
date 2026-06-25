import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

// 문서의 *마지막 top-level footnoteList* 에 새 footnoteItem 을 지정 ordinal 위치에 insert — 없으면 list 자체를 새로 만든다.
// ordinal: 새 reference 의 doc 순서 인덱스 (0-based). 같은 ordinal 자리에 item 을 넣어야 numbering plugin 의 doc-order
// 재할당 결과 reference↔item 의 number 가 짝이 맞는다. ordinal 이 itemCount 이상이면 마지막에 append.
// `doc.lastChild` 가 아니라 type 으로 list 를 찾는 이유: StarterKit 의 trailingNode 가 list 뒤에 paragraph 를 자동으로 두면
// lastChild 가 paragraph 가 되어 매번 새 list 가 생기는 회귀가 난다.
// 반환: 새 item 의 첫 paragraph 안쪽 위치 — 호출자가 caret 을 그 자리로 옮겨 사용자가 즉시 입력 가능.
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

  // forEach 콜백 안의 재할당을 TS narrow 가 추적 못해 `as` 가 강제되는 패턴을 피하려고 array 누적 → 마지막 원소만 추출.
  const lists: Array<{ node: PMNode; pos: number }> = [];
  doc.forEach((node, offset) => {
    if (node.type === listType) {
      lists.push({ node, pos: offset });
    }
  });
  const last = lists[lists.length - 1];

  if (last !== undefined) {
    // 기존 list 안의 ordinal 위치에 item insert. ordinal >= itemCount 이면 마지막 item 뒤 (list 닫기 앞) 에 들어감.
    const itemCount = last.node.childCount;
    const clamped = Math.min(Math.max(ordinal, 0), itemCount);
    let insertPos = last.pos + 1;
    for (let i = 0; i < clamped; i += 1) {
      insertPos += last.node.child(i).nodeSize;
    }
    tr.insert(insertPos, newItem);
    // insertPos = item open → +1 item 내부 → +1 paragraph 내부 (caret 목표).
    return { itemParagraphPos: insertPos + 2 };
  }

  // list 가 없으면 새로 생성. item 한 개라 ordinal 무관.
  const newList = listType.create(null, newItem);
  const insertPos = doc.content.size;
  tr.insert(insertPos, newList);
  // insertPos = list open → +1 list 내부 → +1 item 내부 → +1 paragraph 내부.
  return { itemParagraphPos: insertPos + 3 };
}
