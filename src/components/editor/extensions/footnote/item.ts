import { mergeAttributes, Node } from "@tiptap/core";

export const FootnoteItem = Node.create({
  name: "footnoteItem",
  content: "block+",
  defining: true,
  isolating: true,

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
    // StarterKit ListItem 이 li 를 먼저 가져가지 않게 priority 우선.
    return [{ tag: "li[data-footnote-item]", priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const number = typeof node.attrs.number === "number" ? node.attrs.number : 1;
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-item": "",
        id: `fn-${number}`,
        class: "footnote-item",
        role: "doc-footnote",
      }),
      0,
    ];
  },
});
