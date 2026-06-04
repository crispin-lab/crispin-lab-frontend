import { PageLinkNode } from "./node";

// viewer 는 PageLinkChipNavigator 가 click + Enter 위임으로 활성화하는 컨텍스트 — role/tabindex 가 의미를 가진다.
// editor 모드는 같은 chip 이 atom 노드라 ProseMirror selection 으로 다뤄지므로 role=link 가 거짓 신호가 된다.
export const viewerPageLink = PageLinkNode.extend({
  renderHTML({ node, HTMLAttributes }) {
    const displayText = typeof node.attrs.displayText === "string" ? node.attrs.displayText : "";
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-page-link": "",
        role: "link",
        tabindex: "0",
        class: "page-link-chip rounded bg-accent px-1 py-0.5 text-accent-foreground",
      },
      displayText,
    ];
  },
});
