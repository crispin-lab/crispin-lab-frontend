import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { viewerTable } from "./viewer";

const extensions = [StarterKit, ...viewerTable];

describe("Table extension — JSON round-trip", () => {
  it("JSON 의 표 노드를 HTML table 로 직렬화한다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "이름" }] }],
                },
                {
                  type: "tableHeader",
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "역할" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Alice" }] }],
                },
                {
                  type: "tableCell",
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "리뷰어" }] }],
                },
              ],
            },
          ],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html).toContain("이름");
    expect(html).toContain("Alice");
  });

  it("HTML table 을 다시 JSON 으로 복원해도 셀 텍스트가 유지된다", () => {
    const html = `
      <table>
        <tbody>
          <tr><th><p>이름</p></th><th><p>역할</p></th></tr>
          <tr><td><p>Alice</p></td><td><p>리뷰어</p></td></tr>
        </tbody>
      </table>
    `;

    const json = generateJSON(html, extensions);
    const serialized = JSON.stringify(json);

    expect(serialized).toContain('"type":"table"');
    expect(serialized).toContain('"type":"tableHeader"');
    expect(serialized).toContain('"type":"tableCell"');
    expect(serialized).toContain("이름");
    expect(serialized).toContain("Alice");
  });
});
