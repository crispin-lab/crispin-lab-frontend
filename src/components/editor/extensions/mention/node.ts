import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";

// viewer 도 import 하므로 suggestion / 검색 / React 의존이 없어야 한다.
// Mention 베이스의 attribute / keyboardShortcuts / renderText 는 우리 attribute (`userId`, `handle`)
// 와 호환되지 않아 모두 명시적으로 교체한다 — 부모 동작에 우연히 의존해 Mention 버전 업그레이드에서 회귀하는 것을 막는다.
export const MentionNode = Mention.extend({
  name: "mention",

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-user-id"),
        renderHTML: (attrs) => {
          if (typeof attrs.userId !== "string" || attrs.userId === "") return {};
          return { "data-user-id": attrs.userId };
        },
      },
      handle: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-handle") ?? element.textContent ?? "";
          return raw.startsWith("@") ? raw.slice(1) : raw;
        },
        renderHTML: (attrs) => {
          if (typeof attrs.handle !== "string" || attrs.handle === "") return {};
          return { "data-handle": attrs.handle };
        },
      },
    };
  },

  // atom 노드라서 ProseMirror 의 기본 Backspace 가 chip 전체를 한 번에 지운다. 별도 단축키 불필요.
  addKeyboardShortcuts() {
    return {};
  },

  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const handle = typeof node.attrs.handle === "string" ? node.attrs.handle : "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mention": "",
        class: "mention-chip rounded bg-accent px-1 py-0.5 text-accent-foreground",
      }),
      `@${handle}`,
    ];
  },

  // 부모 Mention 의 기본 renderText 는 `${suggestion.char}${attrs.label ?? attrs.id}` 를 반환하는데
  // 우리는 label/id 를 없애고 handle/userId 로 교체해서 `editor.getText()` 나 복사 경로에서 `@null` 이 나온다.
  renderText({ node }) {
    const handle = typeof node.attrs.handle === "string" ? node.attrs.handle : "";
    return `@${handle}`;
  },
});
