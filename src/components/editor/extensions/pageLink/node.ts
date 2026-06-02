import Mention from "@tiptap/extension-mention";

// viewer 도 import 하므로 suggestion / 검색 / React 의존이 없어야 한다.
// Mention 베이스의 attribute / keyboardShortcuts / markdown spec 는 우리 attribute (`pageId`, `displayText`)
// 와 호환되지 않아 모두 명시적으로 교체한다 — 부모 동작에 우연히 의존해 Mention 버전 업그레이드에서 회귀하는 것을 막는다.
export const PageLinkNode = Mention.extend({
  name: "pageLink",

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-id"),
        renderHTML: (attrs) => {
          if (typeof attrs.pageId !== "string" || attrs.pageId === "") return {};
          return { "data-page-id": attrs.pageId };
        },
      },
      displayText: {
        default: "",
        parseHTML: (element) => element.textContent ?? "",
        renderHTML: () => ({}),
      },
    };
  },

  // atom 노드라서 ProseMirror 의 기본 Backspace 가 chip 전체를 한 번에 지운다. 별도 단축키 불필요.
  addKeyboardShortcuts() {
    return {};
  },

  parseHTML() {
    return [{ tag: "span[data-page-link]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const displayText = typeof node.attrs.displayText === "string" ? node.attrs.displayText : "";
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-page-link": "",
        class: "page-link-chip rounded bg-accent px-1 py-0.5 text-accent-foreground",
      },
      displayText,
    ];
  },
});
