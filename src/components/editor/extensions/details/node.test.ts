import { Editor } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { editorDetails } from "./index";
import { viewerDetails } from "./viewer";

const extensions = [StarterKit, ...viewerDetails];

function makeEditor(open: boolean) {
  return new Editor({
    extensions: [StarterKit, ...editorDetails],
    content: {
      type: "doc",
      content: [
        {
          type: "details",
          attrs: { open },
          content: [
            { type: "detailsSummary", content: [{ type: "text", text: "요약" }] },
            {
              type: "detailsContent",
              content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
            },
          ],
        },
      ],
    },
  });
}

function clickSummary(editor: Editor) {
  const summary = editor.view.dom.querySelector("summary");
  if (summary === null) throw new Error("summary element not found in editor DOM");
  summary.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function findDetailsOpen(editor: Editor): boolean | undefined {
  let open: boolean | undefined;
  editor.state.doc.descendants((node) => {
    if (open !== undefined) return false;
    if (node.type.name === "details") {
      open = node.attrs.open as boolean;
      return false;
    }
    return true;
  });
  return open;
}

describe("Details — JSON round-trip", () => {
  it("open 인 details 는 <details open> 으로 직렬화된다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "details",
          attrs: { open: true },
          content: [
            { type: "detailsSummary", content: [{ type: "text", text: "스펙 요약" }] },
            {
              type: "detailsContent",
              content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
            },
          ],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toMatch(/<details[^>]*open/);
    expect(html).toContain("<summary");
    expect(html).toContain("스펙 요약");
    expect(html).toContain('data-details-content=""');
    expect(html).toContain("본문");
  });

  it("open 미설정은 attribute 미부착 (closed)", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "details",
          attrs: { open: false },
          content: [
            { type: "detailsSummary", content: [{ type: "text", text: "닫힘" }] },
            {
              type: "detailsContent",
              content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
            },
          ],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it("HTML 의 <details open> 을 JSON 으로 복원하면 attrs.open 이 true", () => {
    const html = `
      <details open>
        <summary>요약</summary>
        <div data-details-content><p>본문</p></div>
      </details>
    `;

    const json = generateJSON(html, extensions);
    const serialized = JSON.stringify(json);

    expect(serialized).toContain('"type":"details"');
    expect(serialized).toContain('"type":"detailsSummary"');
    expect(serialized).toContain('"type":"detailsContent"');
    expect(serialized).toContain('"open":true');
    expect(serialized).toContain("요약");
    expect(serialized).toContain("본문");
  });
});

describe("Details NodeView — summary 클릭 토글", () => {
  let editor: Editor;
  afterEach(() => {
    editor.destroy();
  });

  it("열린 상태에서 summary 클릭 시 attrs.open 이 false 로 토글된다", () => {
    editor = makeEditor(true);
    clickSummary(editor);

    expect(findDetailsOpen(editor)).toBe(false);
  });

  it("닫힌 상태에서 summary 클릭 시 다시 펼침으로 돌아온다", () => {
    editor = makeEditor(false);
    clickSummary(editor);

    expect(findDetailsOpen(editor)).toBe(true);
  });

  it("토글 후 JSON serialize 시 변경된 open 이 보존된다", () => {
    editor = makeEditor(true);
    clickSummary(editor);

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"open":false');
  });

  it("토글 후 PM selection 이 깨지지 않는다", () => {
    editor = makeEditor(true);
    const before = editor.state.selection.from;
    clickSummary(editor);

    expect(editor.state.selection.from).toBe(before);
    expect(editor.state.selection.empty).toBe(true);
  });

  it("nested details 의 inner summary 클릭이 outer 의 open 을 건드리지 않는다", () => {
    editor = new Editor({
      extensions: [StarterKit, ...editorDetails],
      content: {
        type: "doc",
        content: [
          {
            type: "details",
            attrs: { open: true },
            content: [
              { type: "detailsSummary", content: [{ type: "text", text: "outer" }] },
              {
                type: "detailsContent",
                content: [
                  {
                    type: "details",
                    attrs: { open: true },
                    content: [
                      { type: "detailsSummary", content: [{ type: "text", text: "inner" }] },
                      {
                        type: "detailsContent",
                        content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    // inner summary 만 정확히 클릭 — DOM 에 summary 두 개가 있고 inner 는 두 번째.
    const summaries = editor.view.dom.querySelectorAll("summary");
    if (summaries.length !== 2) throw new Error(`expected 2 summaries, got ${summaries.length}`);
    summaries[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const opens: boolean[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "details") opens.push(node.attrs.open as boolean);
      return true;
    });

    // doc 순서: outer first, inner second. outer 는 true 유지, inner 는 false 로 토글.
    expect(opens).toEqual([true, false]);
  });
});
