import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import { CodeBlockView } from "./CodeBlockView";
import { lowlight } from "./lowlight";

export { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./lowlight";

// 에디터 NodeView 는 CodeMirror 6 기반 (raw ProseMirror NodeView). viewer (RSC, read-only) 는 lowlight 그대로 — `./viewer` 가 담당.
// lowlight + highlight.js 17 개 언어 grammar 는 viewer 의 renderHTML 에서 사용 (mermaid 는 RAW_PASSTHROUGH 로 별도 분기).
export function editorCodeBlock() {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return (props) => new CodeBlockView(props);
    },
  }).configure({
    lowlight,
    defaultLanguage: "text",
  });
}
