import type { MentionContext } from "@/lib/mention/context";

import { MentionNode } from "./node";
import { createMentionSuggestion } from "./suggestion";

type EditorMentionOptions = {
  getMentionContext: () => MentionContext | null;
  onRefreshAvailable?: (refresh: () => void) => void;
};

// editor 측만 export. viewer 는 `./viewer` (suggestion / @tiptap/react 의존 없음) — RSC 에서 그쪽을 import.
export function editorMention({
  getMentionContext,
  onRefreshAvailable,
}: EditorMentionOptions): ReturnType<typeof MentionNode.configure> {
  return MentionNode.configure({
    suggestion: createMentionSuggestion({ getMentionContext, onRefreshAvailable }),
  });
}
