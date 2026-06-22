import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import { isRawPassthroughLanguage, lowlight, normalizeLanguage } from "./lowlight";

// static-renderer 는 ProseMirror plugin 을 안 돌려 LowlightPlugin 의 Decoration 색칠이 viewer 에선 안 된다 — renderHTML 에서 hast → DOMOutputSpec 직접 직렬화.
// raw passthrough 언어 (mermaid) 는 hljs skip + data-mermaid 마킹만 — MermaidMounter 가 client hydrate.
export const viewerCodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = normalizeLanguage(node.attrs.language);
    const text = node.textContent;
    const codeAttrs = { class: `hljs language-${language}` };

    if (isRawPassthroughLanguage(language)) {
      const preAttrs = {
        ...HTMLAttributes,
        ...(language === "mermaid" ? { "data-mermaid": "true" } : {}),
      };
      return ["pre", preAttrs, ["code", codeAttrs, text]];
    }
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
