import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { viewerCallout } from "./viewer";

const extensions = [StarterKit, viewerCallout];

describe("Callout — JSON round-trip", () => {
  it("info / warn / tip 세 kind 모두 직렬화된다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "info" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "정보 메시지" }] }],
        },
        {
          type: "callout",
          attrs: { kind: "warn" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "경고 메시지" }] }],
        },
        {
          type: "callout",
          attrs: { kind: "tip" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "팁 메시지" }] }],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain('data-callout=""');
    expect(html).toContain('data-kind="info"');
    expect(html).toContain('data-kind="warn"');
    expect(html).toContain('data-kind="tip"');
    expect(html).toContain("정보 메시지");
    expect(html).toContain("경고 메시지");
    expect(html).toContain("팁 메시지");
  });

  it("알 수 없는 kind 는 info 로 fallback 한다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "danger" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "위험" }] }],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain('data-kind="info"');
    expect(html).not.toContain('data-kind="danger"');
  });

  it("HTML 의 callout 을 JSON 으로 복원할 때 kind 가 유지된다", () => {
    const html = `<div data-callout data-kind="warn"><p>경고</p></div>`;

    const json = generateJSON(html, extensions);
    const serialized = JSON.stringify(json);

    expect(serialized).toContain('"type":"callout"');
    expect(serialized).toContain('"kind":"warn"');
    expect(serialized).toContain("경고");
  });
});
