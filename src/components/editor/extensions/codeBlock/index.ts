import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { CodeBlockNodeView } from "./CodeBlockNodeView";
import { lowlight } from "./lowlight";

export { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./lowlight";

// viewer 경로는 ./viewer (React 의존 없음) — RSC 에서 그쪽을 import.
// lowlight + highlight.js 9 개 언어는 양쪽 번들 모두에 들어간다 (viewer 의 renderHTML 도 lowlight 를 직접 호출하므로 의도된 비용).
export function editorCodeBlock() {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockNodeView);
    },
  }).configure({
    lowlight,
    defaultLanguage: "text",
  });
}
