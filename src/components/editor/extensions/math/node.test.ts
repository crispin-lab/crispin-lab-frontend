import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { viewerMath } from "./viewer";

const extensions = [StarterKit, ...viewerMath];

describe("Math — JSON round-trip", () => {
  it("inline math 노드가 data-latex 를 유지하면서 직렬화된다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "공식: " },
            { type: "inlineMath", attrs: { latex: "x^2" } },
          ],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain('data-type="inline-math"');
    expect(html).toContain('data-latex="x^2"');
  });

  it("block math 노드도 wrapper 와 data-latex 로 직렬화된다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "blockMath",
          attrs: { latex: "\\int x dx" },
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain('data-type="block-math"');
    expect(html).toContain("\\int x dx");
  });

  it("HTML 의 math wrapper 를 JSON 으로 복원하면 latex 가 보존된다", () => {
    const original = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "inlineMath", attrs: { latex: "a+b" } }],
        },
      ],
    };

    const html = generateHTML(original, extensions);
    const restored = generateJSON(html, extensions);
    const serialized = JSON.stringify(restored);

    expect(serialized).toContain('"type":"inlineMath"');
    expect(serialized).toContain('"latex":"a+b"');
  });
});
