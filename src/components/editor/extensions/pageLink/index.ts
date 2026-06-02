import type { SpaceId } from "@/lib/api/ids";

import { PageLinkNode } from "./node";
import { createPageLinkSuggestion } from "./suggestion";

export function editorPageLink({ spaceId }: { spaceId: SpaceId }) {
  return PageLinkNode.configure({
    suggestion: createPageLinkSuggestion(spaceId),
  });
}

export const viewerPageLink = PageLinkNode;
