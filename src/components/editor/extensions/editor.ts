import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

import type { SpaceId } from "@/lib/api/ids";
import type { Visibility } from "@/lib/page/visibility";

import { editorCodeBlock } from "./codeBlock";
import { editorPageLink } from "./pageLink";

type EditorExtensionsOptions = {
  spaceId: SpaceId;
  getSourceVisibility?: () => Visibility;
  onRefreshAvailable?: (refresh: () => void) => void;
  placeholder?: string;
};

// StarterKit v3 가 Link 확장을 기본 포함하므로 별도 import 하지 않는다 (중복 등록 시 `Duplicate extension names` 회귀).
// editor 경로는 suggestion → @tiptap/react 의존 — Client Component (Editor.tsx) 에서만 import.
export function editorExtensions({
  spaceId,
  getSourceVisibility,
  onRefreshAvailable,
  placeholder,
}: EditorExtensionsOptions) {
  return [
    StarterKit.configure({ codeBlock: false }),
    editorCodeBlock(),
    editorPageLink({ spaceId, getSourceVisibility, onRefreshAvailable }),
    // showOnlyWhenEditable 기본 (true) — read-only viewer 와 자연 분리. 빈 문서의 첫 노드에 data-placeholder 박힘.
    ...(placeholder !== undefined ? [Placeholder.configure({ placeholder })] : []),
  ];
}
