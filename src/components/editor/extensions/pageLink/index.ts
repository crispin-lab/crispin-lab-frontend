import type { SpaceId } from "@/lib/api/ids";
import type { Visibility } from "@/lib/page/visibility";

import { PageLinkNode } from "./node";
import { createPageLinkSuggestion } from "./suggestion";

type EditorPageLinkOptions = {
  spaceId: SpaceId;
  getSourceVisibility?: () => Visibility;
};

// editor 측만 export. viewer 는 `./viewer` (suggestion / @tiptap/react 의존 없음) — RSC 에서 그쪽을 import.
export function editorPageLink({ spaceId, getSourceVisibility }: EditorPageLinkOptions) {
  return PageLinkNode.configure({
    suggestion: createPageLinkSuggestion({ spaceId, getSourceVisibility }),
  });
}
