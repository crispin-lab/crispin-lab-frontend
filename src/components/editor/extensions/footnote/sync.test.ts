import { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { editorFootnote } from "./index";

function makeEditor(initial?: object) {
  return new Editor({
    extensions: [StarterKit, ...editorFootnote()],
    content: initial,
  });
}

function findNodes(editor: Editor, typeName: string): Array<{ node: PMNode; pos: number }> {
  const hits: Array<{ node: PMNode; pos: number }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === typeName) hits.push({ node, pos });
    return true;
  });
  return hits;
}

function countNodes(editor: Editor, typeName: string): number {
  return findNodes(editor, typeName).length;
}

function collectRefNumbers(editor: Editor): number[] {
  return findNodes(editor, "footnoteReference").map((h) => h.node.attrs.number as number);
}

function collectItems(editor: Editor): Array<{ number: number; text: string }> {
  return findNodes(editor, "footnoteItem").map((h) => ({
    number: h.node.attrs.number as number,
    text: h.node.textContent,
  }));
}

// 본문 atom 노드 (ref) 또는 block 노드 (item) 를 위치 + nodeSize 로 직접 삭제.
function deleteNodeAt(editor: Editor, typeName: string, indexInDoc: number): void {
  const hits = findNodes(editor, typeName);
  const hit = hits[indexInDoc];
  if (hit === undefined) throw new Error(`${typeName}[${indexInDoc}] 가 doc 에 없다`);
  editor.view.dispatch(editor.state.tr.delete(hit.pos, hit.pos + hit.node.nodeSize));
}

describe("FootnoteSync plugin", () => {
  // makeEditor 가 던지면 editor 가 미할당 상태로 afterEach 에 진입할 수 있어 2 차 에러로 원인이 가려진다.
  let editor: Editor | undefined;
  afterEach(() => {
    editor?.destroy();
    editor = undefined;
  });

  it("ref 삭제 시 같은 number 의 item 도 cascade 삭제된다", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 2 } },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 2 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
          ],
        },
      ],
    });

    deleteNodeAt(editor, "footnoteReference", 0);

    expect(collectRefNumbers(editor)).toEqual([1]);
    expect(collectItems(editor)).toEqual([{ number: 1, text: "B" }]);
  });

  it("중간 ref 삭제 → 정확히 짝인 item 이 삭제되어 콘텐츠 짝이 유지된다", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 2 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 3 } },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 2 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 3 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }],
            },
          ],
        },
      ],
    });

    // ref(2) 삭제 — numbering 이 먼저 돌면 *마지막* item C 가 사라지는 회귀가 나는 케이스.
    deleteNodeAt(editor, "footnoteReference", 1);

    expect(collectRefNumbers(editor)).toEqual([1, 2]);
    expect(collectItems(editor)).toEqual([
      { number: 1, text: "A" },
      { number: 2, text: "C" },
    ]);
  });

  it("item 만 삭제하면 ref 가 있는 동안 빈 item 이 보충된다", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 2 } },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 2 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
          ],
        },
      ],
    });

    // item(1)='A' 삭제 시도 → ref(1) 이 살아 있으므로 빈 item 이 같은 ordinal 자리에 복원.
    deleteNodeAt(editor, "footnoteItem", 0);

    expect(collectRefNumbers(editor)).toEqual([1, 2]);
    expect(collectItems(editor)).toEqual([
      { number: 1, text: "" },
      { number: 2, text: "B" },
    ]);
  });

  it("모든 ref 가 삭제되면 list 자체가 사라진다", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "footnoteReference", attrs: { number: 1 } }],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "혼자" }] }],
            },
          ],
        },
      ],
    });

    deleteNodeAt(editor, "footnoteReference", 0);

    expect(countNodes(editor, "footnoteReference")).toBe(0);
    expect(countNodes(editor, "footnoteList")).toBe(0);
    expect(countNodes(editor, "footnoteItem")).toBe(0);
  });

  it("두 개의 list 중 한 쪽의 ref 만 전부 사라지면 그 list 만 통째로 사라지고 다른 list 는 무사하다", () => {
    // schema 는 다중 footnoteList 를 막지 않는다. 한 list 전체가 orphan 일 때 그 list 만 wholly-delete 되는지
    // 확인 — 빈 list (content "footnoteItem+" 위반) 가 남으면 schema 회귀.
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 2 } },
            { type: "text", text: " 사이 " },
            { type: "footnoteReference", attrs: { number: 3 } },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 2 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "구분" }] },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 3 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }],
            },
          ],
        },
      ],
    });

    // 첫 list 와 짝인 ref(1), ref(2) 를 모두 삭제 (큰 index 부터 — pos shift 회피).
    deleteNodeAt(editor, "footnoteReference", 1);
    deleteNodeAt(editor, "footnoteReference", 0);

    expect(countNodes(editor, "footnoteList")).toBe(1);
    expect(collectItems(editor)).toEqual([{ number: 1, text: "C" }]);
  });

  it("ref 들의 짝인 item 이 모두 없으면 새 item 들이 ref 순서대로 보충된다", () => {
    // list 가 통째로 사라지거나 fixture 가 비정상이라 ref 만 남은 경우 — missing 큰 number 부터 처리하면
    // 결과 doc 순서가 ref 순서와 어긋나지 않아야 한다.
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 2 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 3 } },
          ],
        },
      ],
    });

    // 초기 state 는 tx 가 없어 plugin 미발화 — 한 번 흔들어 sync 가 보충하게 한다.
    editor.commands.insertContent(" ");

    expect(countNodes(editor, "footnoteList")).toBe(1);
    expect(collectItems(editor)).toEqual([
      { number: 1, text: "" },
      { number: 2, text: "" },
      { number: 3, text: "" },
    ]);
  });

  it("같은 number 의 ref 가 둘이어도 sync ↔ numbering 재발화 한 사이클에 짝이 맞는다", () => {
    // missing 은 number 기준 dedup 되어 한 번만 생성. 이후 numbering 이 doc-order 로 재할당해 두 번째 ref 가
    // 새 number 를 얻으면, 다음 sync 발화에서 추가 item 이 자동 보충된다.
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 1 } },
          ],
        },
      ],
    });

    editor.commands.insertContent(" ");

    expect(collectRefNumbers(editor)).toEqual([1, 2]);
    expect(collectItems(editor)).toEqual([
      { number: 1, text: "" },
      { number: 2, text: "" },
    ]);
  });

  it("다중 list 환경에서 한 list 의 item 만 사라지면 같은 list 의 짝 자리에 빈 item 이 보충된다", () => {
    // 정상 흐름 (slash 만 사용) 에서는 multi-list 가 만들어지지 않지만, 붙여넣기 / migration 의 안전망.
    // 회귀 시: appendFootnoteItem 가 *마지막* list 만 보던 시기에는 빈 item 이 list_B 로 들어가
    // numbering 이후 list_A 의 콘텐츠가 한 번호씩 밀려 ref(2)↔'C', ref(3)↔empty, ref(4)↔'D' 로 misalign.
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 2 } },
            { type: "text", text: " 사이 " },
            { type: "footnoteReference", attrs: { number: 3 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 4 } },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 2 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "구분" }] },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 3 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 4 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "D" }] }],
            },
          ],
        },
      ],
    });

    // list_A 의 item(2)='B' 만 삭제 → 빈 item 이 list_A 의 item(1) 뒤 자리에 들어가야 짝 보존.
    deleteNodeAt(editor, "footnoteItem", 1);

    expect(countNodes(editor, "footnoteList")).toBe(2);
    expect(collectItems(editor)).toEqual([
      { number: 1, text: "A" },
      { number: 2, text: "" },
      { number: 3, text: "C" },
      { number: 4, text: "D" },
    ]);
  });

  it("ref 가 없는 list 의 마지막 item 을 사용자가 직접 지우면 빈 list 자체가 cleanup 된다", () => {
    // 정상 흐름에서는 발생하지 않지만, 붙여넣기 / migration 으로 들어온 orphan list 의 item 을 사용자가
    // 지웠을 때 빈 list (schema "footnoteItem+" 위반) 가 남는 회귀를 막는다.
    editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "본문" }] },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "ref 없는 item" }] }],
            },
          ],
        },
      ],
    });

    deleteNodeAt(editor, "footnoteItem", 0);

    expect(countNodes(editor, "footnoteList")).toBe(0);
    expect(countNodes(editor, "footnoteItem")).toBe(0);
  });

  it("balanced 상태에서는 transaction 이 추가로 발생하지 않는다 (무한 루프 방어)", () => {
    let txCount = 0;
    editor = new Editor({
      extensions: [StarterKit, ...editorFootnote()],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "footnoteReference", attrs: { number: 1 } }],
          },
          {
            type: "footnoteList",
            content: [
              {
                type: "footnoteItem",
                attrs: { number: 1 },
                content: [{ type: "paragraph" }],
              },
            ],
          },
        ],
      },
      onTransaction: () => {
        txCount += 1;
      },
    });

    const before = txCount;
    editor.commands.insertContent(" ");
    expect(txCount - before).toBe(1);
  });
});
