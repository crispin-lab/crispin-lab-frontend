import { generateHTML, generateJSON } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { viewerExtensions } from "../viewer";

describe("PageLinkNode", () => {
  it("JSON 의 pageLink 노드를 chip span 으로 직렬화한다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "본 페이지는 " },
            {
              type: "pageLink",
              attrs: { pageId: "p_meeting", displayText: "회의록" },
            },
            { type: "text", text: " 에서 파생됐다." },
          ],
        },
      ],
    };

    const html = generateHTML(json, viewerExtensions);

    expect(html).toContain('data-page-link=""');
    expect(html).toContain('data-page-id="p_meeting"');
    expect(html).toContain("회의록");
    expect(html).toContain("page-link-chip");
    expect(html).toContain("bg-accent");
    expect(html).toContain('role="link"');
    expect(html).toContain('tabindex="0"');
  });

  it("HTML 의 chip span 을 JSON 으로 복원한다", () => {
    const html = `
      <p>본 페이지는 <span data-page-link="" data-page-id="p_meeting">회의록</span> 에서 파생됐다.</p>
    `;

    const json = generateJSON(html, viewerExtensions);

    const paragraph = (json as { content: Array<{ content: unknown[] }> }).content[0];
    const pageLink = paragraph.content.find((n) => (n as { type: string }).type === "pageLink") as {
      type: string;
      attrs: { pageId: string; displayText: string };
    };

    expect(pageLink).toBeDefined();
    expect(pageLink.attrs.pageId).toBe("p_meeting");
    expect(pageLink.attrs.displayText).toBe("회의록");
  });
});
