import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { viewerFootnote } from "./viewer";

const extensions = [StarterKit, ...viewerFootnote];

describe("Footnote — JSON round-trip", () => {
  it("reference 와 item / list 가 number attr 과 anchor href 로 직렬화된다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "본문" },
            { type: "footnoteReference", attrs: { number: 1 } },
            { type: "text", text: " 끝." },
          ],
        },
        {
          type: "footnoteList",
          content: [
            {
              type: "footnoteItem",
              attrs: { number: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "각주 내용" }] }],
            },
          ],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain('data-footnote-ref=""');
    expect(html).toContain('href="#fn-1"');
    expect(html).toContain("[1]");
    expect(html).toContain('data-footnotes=""');
    expect(html).toContain('data-footnote-item=""');
    expect(html).toContain('id="fn-1"');
    expect(html).toContain("각주 내용");
    // viewer 정적 HTML 에 editor 전용 placeholder attribute 가 새지 않는다 — LAB-140 회귀 가드.
    expect(html).not.toContain("data-placeholder");
  });

  it("HTML 의 각주 마크업을 JSON 으로 복원해도 number 와 본문이 유지된다", () => {
    const html = `
      <p>본문<a data-footnote-ref href="#fn-2" data-number="2">[2]</a></p>
      <ol data-footnotes>
        <li data-footnote-item id="fn-2" data-number="2"><p>둘째 각주</p></li>
      </ol>
    `;

    const json = generateJSON(html, extensions);
    const serialized = JSON.stringify(json);

    expect(serialized).toContain('"type":"footnoteReference"');
    expect(serialized).toContain('"type":"footnoteList"');
    expect(serialized).toContain('"type":"footnoteItem"');
    expect(serialized).toContain('"number":2');
    expect(serialized).toContain("둘째 각주");
  });
});
