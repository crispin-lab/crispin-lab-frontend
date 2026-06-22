import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

import type { SpaceId } from "@/lib/api/ids";
import type { Visibility } from "@/lib/page/visibility";

import { editorCallout } from "./callout";
import { editorCodeBlock } from "./codeBlock";
import { editorDetails } from "./details";
import { editorFootnote } from "./footnote";
import { editorMath } from "./math";
import { editorPageLink } from "./pageLink";
import { editorSlashMenu } from "./slashMenu";
import { editorTable } from "./table";
import { editorTaskList } from "./taskList";

type EditorExtensionsOptions = {
  spaceId: SpaceId;
  getSourceVisibility?: () => Visibility;
  onRefreshAvailable?: (refresh: () => void) => void;
  placeholder?: string;
};

// 새 확장은 반드시 viewer.ts 에도 등록 (editor.md invariant — 누락 시 같은 JSON 이 다르게 렌더).
// StarterKit v3 가 Link 를 기본 포함 — 별도 import 시 Duplicate extension names 회귀.
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
    ...editorTable(),
    ...editorTaskList(),
    editorCallout,
    ...editorDetails,
    ...editorMath(),
    ...editorFootnote(),
    editorSlashMenu,
    // Placeholder 는 showOnlyWhenEditable 기본 — viewer 에서는 자연 안 보임.
    ...(placeholder !== undefined ? [Placeholder.configure({ placeholder })] : []),
  ];
}
