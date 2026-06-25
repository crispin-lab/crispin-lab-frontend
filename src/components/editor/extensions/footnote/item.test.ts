import { Editor, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { editorFootnote } from "./index";

function makeEditor(initial?: object) {
  return new Editor({
    extensions: [StarterKit, ...editorFootnote()],
    content: initial,
  });
}

const PLACEHOLDER_TEXT = "각주 내용을 입력하세요";

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

describe("FootnoteItem placeholder", () => {
  it("빈 paragraph 의 footnoteItem li 에 data-placeholder 가 박힌다", () => {
    const editor = makeEditor(makeDocWithItem([{ type: "paragraph" }]));
    const li = editor.view.dom.querySelector("li[data-footnote-item]");
    expect(li).not.toBeNull();
    expect(li?.getAttribute("data-placeholder")).toBe(PLACEHOLDER_TEXT);
  });

  it("paragraph 에 텍스트가 들어가도 data-placeholder attribute 자체는 유지된다", () => {
    // CSS `:has(> p:empty)` 가 발화 분기를 담당 — attribute 는 항상 박혀 있고 CSS 가 끄고 켠다.
    const editor = makeEditor(
      makeDocWithItem([{ type: "paragraph", content: [{ type: "text", text: "각주 본문" }] }]),
    );
    const li = editor.view.dom.querySelector("li[data-footnote-item]");
    expect(li?.getAttribute("data-placeholder")).toBe(PLACEHOLDER_TEXT);
  });

  it("JSON 직렬화에 placeholder 가 attr 로 새지 않는다", () => {
    const editor = makeEditor(makeDocWithItem([{ type: "paragraph" }]));
    const json: JSONContent = editor.getJSON();
    const list = json.content?.find((node) => node.type === "footnoteList");
    const item = list?.content?.find((node) => node.type === "footnoteItem");
    expect(item?.attrs).toEqual({ number: 1 });
  });
});
