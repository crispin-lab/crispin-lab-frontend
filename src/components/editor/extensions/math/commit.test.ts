import { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SLASH_ITEMS } from "../slashMenu/items";
import { commitBlockMathLatex } from "./commit";
import { editorMath } from "./index";

function makeEditor(initial?: object) {
  return new Editor({
    extensions: [StarterKit, ...editorMath()],
    content: initial,
  });
}

function findBlockMath(editor: Editor): { node: ProseMirrorNode; pos: number } | null {
  let found: { node: ProseMirrorNode; pos: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.type.name === "blockMath") {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

function expectBlockMath(editor: Editor): { node: ProseMirrorNode; pos: number } {
  const found = findBlockMath(editor);
  if (found === null) throw new Error("expected a blockMath node in the document");
  return found;
}

describe("math slash item", () => {
  let editor: Editor;
  beforeEach(() => {
    editor = makeEditor();
  });
  afterEach(() => {
    editor.destroy();
  });

  it("placeholder latex `x^2` 가 삽입된다", () => {
    const mathItem = SLASH_ITEMS.find((item) => item.key === "math-block");
    if (mathItem === undefined) throw new Error("math-block slash item is missing");
    mathItem.command({ editor, range: { from: 0, to: 0 } });

    expect(expectBlockMath(editor).node.attrs.latex).toBe("x^2");
  });
});

describe("commitBlockMathLatex", () => {
  let editor: Editor;
  beforeEach(() => {
    editor = makeEditor({
      type: "doc",
      content: [{ type: "blockMath", attrs: { latex: "x^2" } }],
    });
  });
  afterEach(() => {
    editor.destroy();
  });

  it("비어 있는 latex 으로 저장하면 blockMath 노드가 삭제된다", () => {
    const target = expectBlockMath(editor);
    commitBlockMathLatex(editor, target.pos, "   ");

    expect(findBlockMath(editor)).toBeNull();
  });

  it("비어 있지 않은 latex 은 trim 후 attrs.latex 로 갱신된다", () => {
    const target = expectBlockMath(editor);
    commitBlockMathLatex(editor, target.pos, "  \\int_0^1 x dx  ");

    expect(expectBlockMath(editor).node.attrs.latex).toBe("\\int_0^1 x dx");
  });
});
