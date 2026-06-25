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

  it("기존 footnoteList 가 있는 상태에서 호출 시 같은 list 에 item 만 append 된다", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph" },
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
      ],
    });
    editor.commands.setTextSelection(1);
    footnoteSlashItem().command({ editor, range: { from: 1, to: 1 } });

    expect(countNodes(editor, "footnoteList")).toBe(1);
    expect(countNodes(editor, "footnoteItem")).toBe(2);
  });
});
