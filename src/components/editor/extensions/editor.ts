import StarterKit from "@tiptap/starter-kit";

import type { SpaceId } from "@/lib/api/ids";

import { editorCodeBlock } from "./codeBlock";
import { editorPageLink } from "./pageLink";

// StarterKit v3 가 Link 확장을 기본 포함하므로 별도 import 하지 않는다 (중복 등록 시 `Duplicate extension names` 회귀).
// editor 경로는 suggestion → @tiptap/react 의존 — Client Component (Editor.tsx) 에서만 import.
export function editorExtensions({ spaceId }: { spaceId: SpaceId }) {
  return [
    StarterKit.configure({ codeBlock: false }),
    editorCodeBlock(),
    editorPageLink({ spaceId }),
  ];
}
