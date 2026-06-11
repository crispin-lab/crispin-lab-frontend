import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { describe, expect, it } from "vitest";

import { viewerExtensions } from "../viewer";

describe("viewerCodeBlock — renderHTML", () => {
  it("등록된 언어는 hljs token span 으로 색칠된 HTML 을 출력한다", () => {
    const html = renderToHTMLString({
      content: {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "typescript" },
            content: [{ type: "text", text: "const greeting = 1;" }],
          },
        ],
      },
      extensions: viewerExtensions,
    });

    expect(html).toContain('class="hljs language-typescript"');
    expect(html).toMatch(/<span class="hljs-keyword">const<\/span>/);
  });

  it("지원 목록에 없는 language 는 hljs language-text 로 표시하고 색칠 시도하지 않는다", () => {
    const html = renderToHTMLString({
      content: {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "rust" },
            content: [{ type: "text", text: "fn main() {}" }],
          },
        ],
      },
      extensions: viewerExtensions,
    });

    expect(html).toContain('class="hljs language-text"');
    expect(html).not.toContain("hljs-keyword");
  });

  it("language attr 누락 (legacy JSON) 케이스도 hljs language-text 로 fallback", () => {
    const html = renderToHTMLString({
      content: {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            content: [{ type: "text", text: "plain text" }],
          },
        ],
      },
      extensions: viewerExtensions,
    });

    expect(html).toContain('class="hljs language-text"');
  });
});
