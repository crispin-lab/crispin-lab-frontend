import StarterKit from "@tiptap/starter-kit";

import type { SpaceId } from "@/lib/api/ids";

import { editorPageLink, viewerPageLink } from "./pageLink";

// StarterKit v3 가 Link 확장을 기본 포함하므로 별도 import 하지 않는다 (중복 등록 시 `Duplicate extension names` 회귀).
export function editorExtensions({ spaceId }: { spaceId: SpaceId }) {
  return [StarterKit, editorPageLink({ spaceId })];
}

export const viewerExtensions = [StarterKit, viewerPageLink];
