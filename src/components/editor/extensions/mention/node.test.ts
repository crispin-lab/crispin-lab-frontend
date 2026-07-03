import { generateHTML, generateJSON, generateText } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { viewerExtensions } from "../viewer";

describe("MentionNode", () => {
  it("JSON 의 mention 노드를 chip span 으로 직렬화한다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "리뷰 부탁 " },
            {
              type: "mention",
              attrs: { userId: "u_alice", handle: "alice" },
            },
            { type: "text", text: " 님" },
          ],
        },
      ],
    };

    const html = generateHTML(json, viewerExtensions);

    expect(html).toContain('data-mention=""');
    expect(html).toContain('data-user-id="u_alice"');
    expect(html).toContain("@alice");
    expect(html).toContain("mention-chip");
    expect(html).toContain("bg-accent");
    expect(html).toContain('title="@alice"');
  });

  it("HTML 의 chip span 을 JSON 으로 복원한다", () => {
    const html = `
      <p>리뷰 부탁 <span data-mention="" data-user-id="u_alice" data-handle="alice">@alice</span> 님</p>
    `;

    const json = generateJSON(html, viewerExtensions);

    const paragraph = (json as { content: Array<{ content: unknown[] }> }).content[0];
    const mention = paragraph.content.find((n) => (n as { type: string }).type === "mention") as {
      type: string;
      attrs: { userId: string; handle: string };
    };

    expect(mention).toBeDefined();
    expect(mention.attrs.userId).toBe("u_alice");
    expect(mention.attrs.handle).toBe("alice");
  });

  it("data-handle 이 없어도 textContent 에서 `@` prefix 를 벗겨 handle 을 복원한다", () => {
    const html = `<p><span data-mention="" data-user-id="u_bob">@bob</span></p>`;

    const json = generateJSON(html, viewerExtensions);

    const paragraph = (json as { content: Array<{ content: unknown[] }> }).content[0];
    const mention = paragraph.content.find((n) => (n as { type: string }).type === "mention") as {
      attrs: { handle: string };
    };

    expect(mention.attrs.handle).toBe("bob");
  });

  it("plain-text 직렬화가 label/id 대신 handle 을 사용한다 (@null 회귀 방어)", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "리뷰 부탁 " },
            { type: "mention", attrs: { userId: "u_alice", handle: "alice" } },
            { type: "text", text: " 님" },
          ],
        },
      ],
    };

    const text = generateText(json, viewerExtensions);

    expect(text).toBe("리뷰 부탁 @alice 님");
    expect(text).not.toContain("@null");
  });
});
