import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import { lowlight, normalizeLanguage } from "./lowlight";

// static-renderer 는 ProseMirror plugin 을 실행하지 않아 LowlightPlugin 의 Decoration 색칠이 viewer 에선 안 된다.
// renderHTML 안에서 lowlight.highlight 의 hast 트리를 DOMOutputSpec 으로 직접 직렬화해야 reading 화면에 색이 나온다.
// React 의존을 끌어오지 않도록 editor/index.ts 와 분리 (pageLink 와 동일 패턴) — RSC 에서 import.
export const viewerCodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = normalizeLanguage(node.attrs.language);
    const text = node.textContent;
    const codeAttrs = { class: `hljs language-${language}` };

    if (language === "text") {
      return ["pre", { ...HTMLAttributes }, ["code", codeAttrs, text]];
    }
    const tree = lowlight.highlight(language, text);
    return [
      "pre",
      { ...HTMLAttributes },
      ["code", codeAttrs, ...hastChildrenToDomSpec(tree.children)],
    ];
  },
}).configure({ lowlight, defaultLanguage: "text" });

type HastText = { type: "text"; value: string };
type HastElement = {
  type: "element";
  tagName: string;
  properties?: { className?: string[] | string };
  children: HastChild[];
};
type HastChild = HastText | HastElement | { type: string };

function hastChildrenToDomSpec(children: readonly { type: string }[]): unknown[] {
  const result: unknown[] = [];
  for (const child of children as HastChild[]) {
    if (child.type === "text") {
      result.push((child as HastText).value);
    } else if (child.type === "element") {
      const element = child as HastElement;
      const raw = element.properties?.className;
      const className = Array.isArray(raw) ? raw.join(" ") : raw;
      const attrs = className ? { class: className } : {};
      result.push([element.tagName, attrs, ...hastChildrenToDomSpec(element.children)]);
    }
  }
  return result;
}
