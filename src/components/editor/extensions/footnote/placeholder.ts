import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// ProseMirror 가 contenteditable 의 빈 block 에 `<br class="ProseMirror-trailingBreak">` 를 view DOM 에 주입해
// CSS `p:empty` 로는 빈 paragraph 를 잡지 못한다. PM *모델* 의 childCount 로 검출해 li 에 동적 class 를 부착한다.
// `node.childCount === 1` 조건: 사용자가 본문 입력 후 Enter 로 paragraph 가 늘어나면 자연 해제 — placeholder 재노출 회귀 방지.
export const FootnoteItemPlaceholderKey = new PluginKey("footnoteItemPlaceholder");

export const FOOTNOTE_ITEM_PLACEHOLDER_CLASS = "footnote-item-placeholder-active";
export const FOOTNOTE_ITEM_PLACEHOLDER_TEXT = "각주 내용을 입력하세요";

export const FootnoteItemPlaceholder = Extension.create({
  name: "footnoteItemPlaceholder",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: FootnoteItemPlaceholderKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "footnoteItem") return true;
              if (node.childCount !== 1) return false;
              const child = node.firstChild;
              if (child === null || child.type.name !== "paragraph") return false;
              if (child.childCount !== 0) return false;
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: FOOTNOTE_ITEM_PLACEHOLDER_CLASS,
                  "data-placeholder": FOOTNOTE_ITEM_PLACEHOLDER_TEXT,
                }),
              );
              return false;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
