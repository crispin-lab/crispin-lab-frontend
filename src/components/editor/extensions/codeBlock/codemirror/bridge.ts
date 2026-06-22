import type { Editor } from "@tiptap/core";
import { Annotation, type Transaction as CmTransaction } from "@codemirror/state";
import type { EditorView, ViewUpdate } from "@codemirror/view";

// 양방향 reentry guard — PM → CM 은 annotation, CM → PM 은 meta. 한쪽이 빠지면 무한 루프.
export const fromPmAnnotation = Annotation.define<boolean>();
export const FROM_CM_META = "codeMirror:fromCm";

export function isFromPm(transactions: readonly CmTransaction[]): boolean {
  return transactions.some((tx) => tx.annotation(fromPmAnnotation) === true);
}

type CmToPmArgs = {
  editor: Editor;
  getPos: () => number | undefined;
  update: ViewUpdate;
};

// iterChanges 의 fromA/toA 는 OLD CM doc 기준 — prior step 의 길이 변화를 offset 으로 누적 보정 (prosemirror-codemirror 표준 패턴).
export function dispatchCmChangesToPm({ editor, getPos, update }: CmToPmArgs): void {
  if (!update.docChanged) return;
  if (isFromPm(update.transactions)) return;
  const pos = getPos();
  if (pos == null) return;

  const tr = editor.view.state.tr;
  let offset = pos + 1;
  let dirty = false;

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const text = inserted.toString();
    const from = offset + fromA;
    const to = offset + toA;
    if (text.length === 0) {
      if (from < to) {
        tr.delete(from, to);
        dirty = true;
      }
    } else {
      // `schema.text("")` 는 invalid — 빈 텍스트는 위 분기에서 처리.
      tr.replaceWith(from, to, editor.view.state.schema.text(text));
      dirty = true;
    }
    offset += toB - fromB - (toA - fromA);
  });

  if (!dirty) return;
  tr.setMeta(FROM_CM_META, true);
  editor.view.dispatch(tr);
}

type SyncPmToCmArgs = {
  cmView: EditorView;
  newText: string;
};

// 같은 텍스트면 no-op — focus / selection 흔들지 않게.
export function syncPmTextToCm({ cmView, newText }: SyncPmToCmArgs): boolean {
  const current = cmView.state.doc.toString();
  if (current === newText) return false;
  cmView.dispatch({
    changes: { from: 0, to: current.length, insert: newText },
    annotations: fromPmAnnotation.of(true),
  });
  return true;
}
