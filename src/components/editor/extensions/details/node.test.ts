import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { viewerDetails } from "./viewer";

const extensions = [StarterKit, ...viewerDetails];

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
