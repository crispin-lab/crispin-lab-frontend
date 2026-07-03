import { mergeAttributes } from "@tiptap/core";

import { MentionNode } from "./node";

// viewer 는 hover 시 handle 을 native title 로 노출한다. 클릭·포커스는 활성화하지 않는다 — role="link" 를 붙이면
// href 없이도 AT 링크 순회에 노출돼 스크린 리더 사용자가 무의미한 chip 을 반복해 밟는다.
export const viewerMention = MentionNode.extend({
  renderHTML({ node, HTMLAttributes }) {
    const handle = typeof node.attrs.handle === "string" ? node.attrs.handle : "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mention": "",
        title: `@${handle}`,
        class: "mention-chip rounded bg-accent px-1 py-0.5 text-accent-foreground",
      }),
      `@${handle}`,
    ];
  },
});
