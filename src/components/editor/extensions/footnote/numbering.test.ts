import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { editorFootnote } from "./index";

function makeEditor(initial?: object) {
  return new Editor({
    extensions: [StarterKit, ...editorFootnote()],
    content: initial,
  });
}

describe("FootnoteNumbering plugin", () => {
  it("문서 안의 reference 순서대로 1, 2, 3 으로 재할당한다", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "footnoteReference", attrs: { number: 99 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 99 } },
            { type: "text", text: " " },
            { type: "footnoteReference", attrs: { number: 99 } },
          ],
        },
      ],
    });

    // 초기 content 자체로는 transaction 이 dispatch 되지 않는다 — 한 번 흔들어 plugin 을 발화시킨다.
    editor.commands.insertContent(" ");

    const numbers: number[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "footnoteReference") {
        numbers.push(node.attrs.number as number);
      }
      return true;
    });

    expect(numbers).toEqual([1, 2, 3]);
    editor.destroy();
  });

  it("item 의 number 도 list 안의 등장 순서대로 재할당된다", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "본문" }] },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 50 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "footnoteItem",
              attrs: { number: 51 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
          ],
        },
      ],
    });

    editor.commands.insertContent(" ");

    const itemNumbers: number[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "footnoteItem") {
        itemNumbers.push(node.attrs.number as number);
      }
      return true;
    });

    expect(itemNumbers).toEqual([1, 2]);
    editor.destroy();
  });

  it("이미 올바른 number 라면 transaction 이 추가로 발생하지 않는다 (무한 루프 방어)", () => {
    // 사용자 변경 (insertContent) 1 회당 transaction 도 1 회만 발화하는지 카운트 — plugin 이 무한 재호출하면 +1 이 누적.
    let txCount = 0;
    const editor = new Editor({
      extensions: [StarterKit, ...editorFootnote()],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "footnoteReference", attrs: { number: 1 } }],
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

    const numbers: number[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "footnoteReference") {
        numbers.push(node.attrs.number as number);
      }
      return true;
    });

    expect(numbers).toEqual([1]);
    editor.destroy();
  });
});
