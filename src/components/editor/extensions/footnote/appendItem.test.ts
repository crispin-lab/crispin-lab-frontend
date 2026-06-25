import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { SLASH_ITEMS, type SlashItem } from "../slashMenu/items";
import { editorFootnote } from "./index";

function makeEditor(initial?: object) {
  return new Editor({
    extensions: [StarterKit, ...editorFootnote()],
    content: initial,
  });
}

function footnoteSlashItem(): SlashItem {
  const item = SLASH_ITEMS.find((it) => it.key === "footnote");
  if (item === undefined) throw new Error("footnote slash item is missing");
  return item;
}

function countNodes(editor: Editor, typeName: string): number {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === typeName) count += 1;
    return true;
  });
  return count;
}

function collectNumbers(editor: Editor, typeName: string): number[] {
  const numbers: number[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === typeName) numbers.push(node.attrs.number as number);
    return true;
  });
  return numbers;
}

function caretIsInside(editor: Editor, typeName: string): boolean {
  const $from = editor.state.selection.$from;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name === typeName) return true;
  }
  return false;
}

describe("footnote slash command", () => {
  let editor: Editor;
  afterEach(() => {
    editor.destroy();
  });

  it("빈 문서에서 한 번 호출 시 reference / list / item 이 동시에 생성되고 caret 이 item 안에 있다", () => {
    editor = makeEditor();
    editor.commands.setTextSelection(1);
    footnoteSlashItem().command({ editor, range: { from: 1, to: 1 } });

    expect(countNodes(editor, "footnoteReference")).toBe(1);
    expect(countNodes(editor, "footnoteList")).toBe(1);
    expect(countNodes(editor, "footnoteItem")).toBe(1);
    expect(caretIsInside(editor, "footnoteItem")).toBe(true);
  });

  it("두 번 호출 시 reference 2 / list 1 / item 2 이고 number 가 doc 순서대로 1/2 로 동기된다", () => {
    editor = makeEditor();
    const item = footnoteSlashItem();

    editor.commands.setTextSelection(1);
    item.command({ editor, range: { from: 1, to: 1 } });
    editor.commands.setTextSelection(1);
    item.command({ editor, range: { from: 1, to: 1 } });

    expect(countNodes(editor, "footnoteReference")).toBe(2);
    expect(countNodes(editor, "footnoteList")).toBe(1);
    expect(countNodes(editor, "footnoteItem")).toBe(2);
    expect(collectNumbers(editor, "footnoteReference")).toEqual([1, 2]);
    expect(collectNumbers(editor, "footnoteItem")).toEqual([1, 2]);
  });

  it("기존 footnoteList 가 있고 그 뒤에 paragraph 가 더 있어도 같은 list 에 item 만 append 된다 (lastChild 회귀 가드)", () => {
    // sync 가 cardinality 를 강제하므로 fixture 는 항상 ref ↔ item 짝을 맞춰 둔다.
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "본문 " },
            { type: "footnoteReference", attrs: { number: 1 } },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "기존" }] }],
            },
          ],
        },
        // doc.lastChild 가 paragraph 가 되어도 type-search 가 list 를 찾는지 검증 — trailingNode 회귀 가드.
        { type: "paragraph" },
      ],
    });
    editor.commands.setTextSelection(1);
    footnoteSlashItem().command({ editor, range: { from: 1, to: 1 } });

    expect(countNodes(editor, "footnoteList")).toBe(1);
    expect(countNodes(editor, "footnoteItem")).toBe(2);
  });

  it("기존 ref 보다 앞쪽 caret 에서 호출 시 새 ref / 새 item 이 같은 ordinal 자리에 들어가 짝이 깨지지 않는다", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "본문 " },
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " 끝" },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "기존 각주" }] }],
            },
          ],
        },
      ],
    });
    // caret 을 paragraph 맨 앞 (pos 1) 에 두어 기존 ref 보다 앞쪽에서 호출.
    editor.commands.setTextSelection(1);
    footnoteSlashItem().command({ editor, range: { from: 1, to: 1 } });

    const refs: number[] = [];
    const items: Array<{ number: number; text: string }> = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "footnoteReference") {
        refs.push(node.attrs.number as number);
      } else if (node.type.name === "footnoteItem") {
        items.push({ number: node.attrs.number as number, text: node.textContent });
      }
      return true;
    });

    // 새 ref (doc 첫 ref) = number 1, 새 item (list 첫 item, 빈 본문) = number 1 — 짝.
    expect(refs[0]).toBe(1);
    expect(items[0].number).toBe(1);
    expect(items[0].text).toBe("");
    // 기존 ref / item 은 number 2 로 밀려나도 서로 짝 유지.
    expect(refs[1]).toBe(2);
    expect(items[1].number).toBe(2);
    expect(items[1].text).toBe("기존 각주");
  });
});
