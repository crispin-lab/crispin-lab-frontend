import { mergeAttributes, Node } from "@tiptap/core";

// content: 'footnoteItem+' — 비어 있는 list 는 만들지 않는다 (item 0 이면 list 자체 제거).
export const FootnoteList = Node.create({
  name: "footnoteList",
  group: "block",
  content: "footnoteItem+",
  defining: true,
  isolating: true,

  parseHTML() {
    // StarterKit OrderedList 가 ol 을 먼저 가져가지 않게 priority 우선.
    return [{ tag: "ol[data-footnotes]", priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, {
        "data-footnotes": "",
        class: "footnote-list",
        role: "doc-endnotes",
      }),
      0,
    ];
  },
});
