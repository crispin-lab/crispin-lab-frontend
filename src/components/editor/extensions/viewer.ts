import Heading from "@tiptap/extension-heading";
import StarterKit from "@tiptap/starter-kit";

import { viewerCodeBlock } from "./codeBlock/viewer";
import { viewerPageLink } from "./pageLink/viewer";

// viewer 는 TOC anchor 를 위해 heading 노드에 id attribute 를 직접 받는 별도 Heading 확장을 쓴다.
const ViewerHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attrs) => (typeof attrs.id === "string" && attrs.id ? { id: attrs.id } : {}),
      },
    };
  },
}).configure({ levels: [1, 2, 3] });

export const viewerExtensions = [
  StarterKit.configure({ heading: false, codeBlock: false }),
  ViewerHeading,
  viewerCodeBlock,
  viewerPageLink,
];
