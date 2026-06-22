import { Mathematics } from "@tiptap/extension-mathematics";

// viewer 는 빈 wrapper 만 남고 KatexMounter 가 [data-type="..."-math"] 를 찾아 katex.renderToString 으로 hydrate.
export const viewerMath = [Mathematics];
