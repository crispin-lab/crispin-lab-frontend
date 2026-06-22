import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    details: {
      setDetails: () => ReturnType;
      unsetDetails: () => ReturnType;
    };
  }
}

// native <details>/<summary> 직렬화 — reader 의 클릭 토글은 브라우저가 처리 (viewer 의 JS 부담 0).
// isolating: true — Backspace 가 details 내부에서 외부 블록으로 새지 않게.
export const DetailsSummary = Node.create({
  name: "detailsSummary",
  content: "inline*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes, { class: "details-summary" }), 0];
  },
});

export const DetailsContent = Node.create({
  name: "detailsContent",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-details-content]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-details-content": "", class: "details-content" }),
      0,
    ];
  },
});

export const DetailsNode = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary detailsContent",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attrs) => (attrs.open ? { open: "" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["details", mergeAttributes(HTMLAttributes, { class: "details" }), 0];
  },

  addCommands() {
    return {
      setDetails:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                { type: "detailsSummary", content: [{ type: "text", text: "더보기" }] },
                { type: "detailsContent", content: [{ type: "paragraph" }] },
              ],
            })
            .run(),
      unsetDetails:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export const DETAILS_NODES = [DetailsNode, DetailsSummary, DetailsContent];
