import { CellSelection } from "@tiptap/pm/tables";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditorBubbleMenu } from "./BubbleMenu";

type Selectionish = { empty: boolean };
type Statelike = {
  selection: Selectionish;
  doc: { textBetween: (from: number, to: number) => string };
};
type ShouldShowCtx = { editor: Editor; state: Statelike; from: number; to: number };

let captured: ((ctx: ShouldShowCtx) => boolean) | undefined;

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: ({
    children,
    shouldShow,
  }: {
    children: ReactNode;
    editor: Editor;
    className?: string;
    shouldShow?: (ctx: ShouldShowCtx) => boolean;
  }) => {
    captured = shouldShow;
    return <div>{children}</div>;
  },
}));

function makeEditor({
  isActiveTable = false,
  isEditable = true,
}: { isActiveTable?: boolean; isEditable?: boolean } = {}): Editor {
  return {
    isActive: (name: string) => name === "table" && isActiveTable,
    isEditable,
  } as unknown as Editor;
}

function textSel(empty: boolean): Selectionish {
  const sel = Object.create(TextSelection.prototype) as Selectionish;
  Object.defineProperty(sel, "empty", { value: empty, configurable: true });
  return sel;
}

function cellSel(): Selectionish {
  const sel = Object.create(CellSelection.prototype) as Selectionish;
  Object.defineProperty(sel, "empty", { value: false, configurable: true });
  return sel;
}

function ctx({
  editor,
  selection,
  textBetween = "hello",
  from = 0,
  to = 5,
}: {
  editor: Editor;
  selection: Selectionish;
  textBetween?: string;
  from?: number;
  to?: number;
}): ShouldShowCtx {
  return {
    editor,
    state: {
      selection,
      doc: { textBetween: () => textBetween },
    },
    from,
    to,
  };
}

describe("EditorBubbleMenu.shouldShow", () => {
  beforeEach(() => {
    captured = undefined;
  });

  it("표 안 + CellSelection 일 때 false — TableToolbar 영역에서 mark menu 숨김", () => {
    const editor = makeEditor({ isActiveTable: true });
    render(<EditorBubbleMenu editor={editor} />);
    expect(captured?.(ctx({ editor, selection: cellSel() }))).toBe(false);
  });

  it("표 안이라도 TextSelection (드래그된 텍스트) 이면 true — 셀 안 mark toggle 유지", () => {
    const editor = makeEditor({ isActiveTable: true });
    render(<EditorBubbleMenu editor={editor} />);
    expect(captured?.(ctx({ editor, selection: textSel(false) }))).toBe(true);
  });

  it("표 밖 + 일반 TextSelection (non-empty) 이면 true", () => {
    const editor = makeEditor({ isActiveTable: false });
    render(<EditorBubbleMenu editor={editor} />);
    expect(captured?.(ctx({ editor, selection: textSel(false) }))).toBe(true);
  });

  it("selection 이 비어 있으면 false", () => {
    const editor = makeEditor();
    render(<EditorBubbleMenu editor={editor} />);
    expect(captured?.(ctx({ editor, selection: textSel(true) }))).toBe(false);
  });

  it("read-only 모드 (isEditable=false) 면 false", () => {
    const editor = makeEditor({ isEditable: false });
    render(<EditorBubbleMenu editor={editor} />);
    expect(captured?.(ctx({ editor, selection: textSel(false) }))).toBe(false);
  });

  it("emptyTextBlock (from===to 의 빈 텍스트) 이면 false — default 동작 유지", () => {
    const editor = makeEditor();
    render(<EditorBubbleMenu editor={editor} />);
    expect(captured?.(ctx({ editor, selection: textSel(false), textBetween: "" }))).toBe(false);
  });
});
