import { mergeAttributes, Node } from "@tiptap/core";

// number 는 FootnoteNumbering plugin 이 문서 순서대로 재할당 — 사용자가 수동으로 바꾸지 않는다.
// href="#fn-N" 은 본문 끝 FootnoteItem 의 id="fn-N" 와 매칭되어 브라우저 native anchor 점프.
export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      number: {
        default: 1,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-number");
          const parsed = raw === null ? 1 : Number.parseInt(raw, 10);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        },
        renderHTML: (attrs) => ({ "data-number": String(attrs.number) }),
      },
    };
  },

  parseHTML() {
    // StarterKit Link 마크가 같은 a 를 먼저 잡아가지 않게 priority 우선.
    return [{ tag: "a[data-footnote-ref]", priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-ref": "",
        href: `#fn-${number}`,
        class: "footnote-ref",
        role: "doc-noteref",
      }),
      `[${number}]`,
    ];
  },
});
