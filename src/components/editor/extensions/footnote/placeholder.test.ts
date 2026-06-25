import { Editor, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { editorFootnote } from "./index";
import { FOOTNOTE_ITEM_PLACEHOLDER_CLASS, FOOTNOTE_ITEM_PLACEHOLDER_TEXT } from "./placeholder";

function makeEditor(initial?: object) {
  return new Editor({
    extensions: [StarterKit, ...editorFootnote()],
    content: initial,
  });
}

function makeDocWithItem(itemContent: object[]) {
  return {
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
            content: itemContent,
          },
        ],
      },
    ],
  };
}

function findItemLi(editor: Editor): Element | null {
  return editor.view.dom.querySelector("li[data-footnote-item]");
}

describe("FootnoteItemPlaceholder Decoration", () => {
  it("빈 paragraph 1 개만 있는 footnoteItem li 에 active class 와 data-placeholder 가 박힌다", () => {
    const editor = makeEditor(makeDocWithItem([{ type: "paragraph" }]));
    const li = findItemLi(editor);
    expect(li).not.toBeNull();
    expect(li?.classList.contains(FOOTNOTE_ITEM_PLACEHOLDER_CLASS)).toBe(true);
    expect(li?.getAttribute("data-placeholder")).toBe(FOOTNOTE_ITEM_PLACEHOLDER_TEXT);
  });

  it("paragraph 에 텍스트가 들어가면 active class 가 해제된다", () => {
    const editor = makeEditor(
      makeDocWithItem([{ type: "paragraph", content: [{ type: "text", text: "각주 본문" }] }]),
    );
    const li = findItemLi(editor);
    expect(li?.classList.contains(FOOTNOTE_ITEM_PLACEHOLDER_CLASS)).toBe(false);
    expect(li?.hasAttribute("data-placeholder")).toBe(false);
  });

  it("footnoteItem 안에 paragraph 가 두 개면 active class 가 해제된다", () => {
    // 사용자가 본문 입력 후 Enter 로 새 paragraph 를 만든 케이스 — 끝의 빈 paragraph 때문에 placeholder 가 재노출되는 회귀 가드.
    const editor = makeEditor(
      makeDocWithItem([
        { type: "paragraph", content: [{ type: "text", text: "첫 줄" }] },
        { type: "paragraph" },
      ]),
    );
    const li = findItemLi(editor);
    expect(li?.classList.contains(FOOTNOTE_ITEM_PLACEHOLDER_CLASS)).toBe(false);
  });

  it("JSON 직렬화에 placeholder 가 attr 로 새지 않는다 (Decoration 은 모델 미반영)", () => {
    const editor = makeEditor(makeDocWithItem([{ type: "paragraph" }]));
    const json: JSONContent = editor.getJSON();
    const list = json.content?.find((node) => node.type === "footnoteList");
    const item = list?.content?.find((node) => node.type === "footnoteItem");
    expect(item?.attrs).toEqual({ number: 1 });
  });

  it("ProseMirror trailing break 가 있어도 모델 기준 childCount 로 검출한다", () => {
    // PM 이 빈 paragraph 의 view DOM 에 <br class="ProseMirror-trailingBreak"> 를 주입해 CSS p:empty 가 매칭하지 않는다 — Decoration 이 모델 (node.firstChild.childCount === 0) 으로 풀어야 안전. 본 케이스는 trailing break 가 실제로 박혔는지와 무관하게 active class 가 부착되어 있음을 확인 (모델 기반 검출의 invariant).
    const editor = makeEditor(makeDocWithItem([{ type: "paragraph" }]));
    const li = findItemLi(editor);
    const p = li?.querySelector("p");
    expect(p).not.toBeNull();
    // trailing break 부착은 ProseMirror 의 구현 디테일 — jsdom 환경에서 박힐 수도 있고 아닐 수도 있다. 어느 쪽이든 모델 기반 Decoration 은 active class 를 박는다.
    expect(li?.classList.contains(FOOTNOTE_ITEM_PLACEHOLDER_CLASS)).toBe(true);
  });
});
