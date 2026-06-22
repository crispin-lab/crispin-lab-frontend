import type { Editor } from "@tiptap/core";
import type { Command, KeyBinding } from "@codemirror/view";

type ExitContext = {
  editor: Editor;
  getPos: () => number | undefined;
};

function arrowUpExit({ editor, getPos }: ExitContext): Command {
  return (cmView) => {
    const { state } = cmView;
    const sel = state.selection.main;
    if (!sel.empty) return false;
    const line = state.doc.lineAt(sel.head);
    if (line.number !== 1) return false;
    const pos = getPos();
    if (pos == null) return false;

    const docState = editor.view.state;
    const $pos = docState.doc.resolve(pos);
    if ($pos.nodeBefore === null) {
      // 코드블록이 doc 의 첫 노드라 갈 곳이 없음 — paragraph 를 앞에 삽입.
      editor.chain().insertContentAt(pos, { type: "paragraph" }).focus(pos).run();
    } else {
      editor.commands.focus(pos - 1);
    }
    return true;
  };
}

function arrowDownExit({ editor, getPos }: ExitContext): Command {
  return (cmView) => {
    const { state } = cmView;
    const sel = state.selection.main;
    if (!sel.empty) return false;
    const line = state.doc.lineAt(sel.head);
    if (line.number !== state.doc.lines) return false;
    if (sel.head !== line.to) return false;
    const pos = getPos();
    if (pos == null) return false;

    const docState = editor.view.state;
    const node = docState.doc.nodeAt(pos);
    if (!node) return false;
    const after = pos + node.nodeSize;
    const $after = docState.doc.resolve(after);
    if ($after.nodeAfter === null) {
      // 코드블록이 doc 의 마지막 노드라 갈 곳이 없음 — paragraph 를 뒤에 삽입.
      editor.chain().insertContentAt(after, { type: "paragraph" }).focus(after).run();
    } else {
      editor.commands.focus(after);
    }
    return true;
  };
}

function backspaceExit({ editor, getPos }: ExitContext): Command {
  return (cmView) => {
    if (cmView.state.doc.length !== 0) return false;
    const pos = getPos();
    if (pos == null) return false;
    editor
      .chain()
      .focus(Math.max(0, pos - 1))
      .deleteNode("codeBlock")
      .run();
    return true;
  };
}

// PM 이 history 단일 출처 — CM 의 Mod-z 를 가로채 PM 으로 forward. preventDefault 로 native undo 차단.
function makeUndo(editor: Editor): Command {
  return () => {
    editor.commands.undo();
    return true;
  };
}

function makeRedo(editor: Editor): Command {
  return () => {
    editor.commands.redo();
    return true;
  };
}

export function buildCodeBlockKeymap(ctx: ExitContext): KeyBinding[] {
  return [
    { key: "ArrowUp", run: arrowUpExit(ctx) },
    { key: "ArrowDown", run: arrowDownExit(ctx) },
    { key: "Backspace", run: backspaceExit(ctx) },
    { key: "Mod-z", run: makeUndo(ctx.editor), preventDefault: true },
    { key: "Mod-Shift-z", run: makeRedo(ctx.editor), preventDefault: true },
    { key: "Mod-y", run: makeRedo(ctx.editor), preventDefault: true },
  ];
}
