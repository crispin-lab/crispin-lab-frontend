import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTableVirtualElement, TableToolbar } from "./TableToolbar";

type Selectionish = { empty: boolean };
type ShouldShowCtx = { editor: Editor; state: { selection: Selectionish } };

type CapturedProps = {
  pluginKey?: string;
  shouldShow?: (ctx: ShouldShowCtx) => boolean;
  getReferencedVirtualElement?: () => unknown;
};

let captured: CapturedProps = {};

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: ({
    children,
    ...rest
  }: CapturedProps & { children: ReactNode; editor: Editor; className?: string }) => {
    captured = {
      pluginKey: rest.pluginKey,
      shouldShow: rest.shouldShow,
      getReferencedVirtualElement: rest.getReferencedVirtualElement,
    };
    return <div data-testid="tiptap-bubble-menu">{children}</div>;
  },
}));

type ChainCalls = {
  focus: ReturnType<typeof vi.fn<() => void>>;
  addRowBefore: ReturnType<typeof vi.fn<() => void>>;
  addRowAfter: ReturnType<typeof vi.fn<() => void>>;
  addColumnBefore: ReturnType<typeof vi.fn<() => void>>;
  addColumnAfter: ReturnType<typeof vi.fn<() => void>>;
  deleteRow: ReturnType<typeof vi.fn<() => void>>;
  deleteColumn: ReturnType<typeof vi.fn<() => void>>;
  toggleHeaderRow: ReturnType<typeof vi.fn<() => void>>;
  deleteTable: ReturnType<typeof vi.fn<() => void>>;
  run: ReturnType<typeof vi.fn<() => void>>;
};

function makeEditor({
  isActiveTable = true,
  isEditable = true,
}: { isActiveTable?: boolean; isEditable?: boolean } = {}): {
  editor: Editor;
  calls: ChainCalls;
} {
  const calls: ChainCalls = {
    focus: vi.fn<() => void>(),
    addRowBefore: vi.fn<() => void>(),
    addRowAfter: vi.fn<() => void>(),
    addColumnBefore: vi.fn<() => void>(),
    addColumnAfter: vi.fn<() => void>(),
    deleteRow: vi.fn<() => void>(),
    deleteColumn: vi.fn<() => void>(),
    toggleHeaderRow: vi.fn<() => void>(),
    deleteTable: vi.fn<() => void>(),
    run: vi.fn<() => void>(),
  };
  const chain: Record<string, unknown> = {
    focus: () => {
      calls.focus();
      return chain;
    },
    addRowBefore: () => {
      calls.addRowBefore();
      return chain;
    },
    addRowAfter: () => {
      calls.addRowAfter();
      return chain;
    },
    addColumnBefore: () => {
      calls.addColumnBefore();
      return chain;
    },
    addColumnAfter: () => {
      calls.addColumnAfter();
      return chain;
    },
    deleteRow: () => {
      calls.deleteRow();
      return chain;
    },
    deleteColumn: () => {
      calls.deleteColumn();
      return chain;
    },
    toggleHeaderRow: () => {
      calls.toggleHeaderRow();
      return chain;
    },
    deleteTable: () => {
      calls.deleteTable();
      return chain;
    },
    run: () => {
      calls.run();
      return true;
    },
  };
  const editor = {
    chain: () => chain,
    isActive: (name: string) => name === "table" && isActiveTable,
    isEditable,
  } as unknown as Editor;
  return { editor, calls };
}

function textSelection(empty: boolean): Selectionish {
  return { empty };
}

function cellSelection(): Selectionish {
  // 실제 CellSelection 의 instanceof 검사를 통과시키는 prototype 인스턴스. Selection prototype 의 `empty`
  // 가 getter 라 defineProperty 로 덮어쓴다.
  const sel = Object.create(CellSelection.prototype) as Selectionish;
  Object.defineProperty(sel, "empty", { value: false, configurable: true });
  return sel;
}

describe("TableToolbar", () => {
  beforeEach(() => {
    captured = {};
  });

  it("editor 가 null 이면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<TableToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("BubbleMenu pluginKey 로 tableToolbar 를 전달해 기존 mark BubbleMenu 와 충돌하지 않게 한다", () => {
    const { editor } = makeEditor();
    render(<TableToolbar editor={editor} />);
    expect(captured.pluginKey).toBe("tableToolbar");
  });

  describe("shouldShow", () => {
    it("표 안 + selection 비어 있을 때 true", () => {
      const { editor } = makeEditor();
      render(<TableToolbar editor={editor} />);
      expect(captured.shouldShow?.({ editor, state: { selection: textSelection(true) } })).toBe(
        true,
      );
    });

    it("표 안 + CellSelection 일 때도 true — 행/열 선택 후 삭제 흐름을 막지 않는다", () => {
      const { editor } = makeEditor();
      render(<TableToolbar editor={editor} />);
      expect(captured.shouldShow?.({ editor, state: { selection: cellSelection() } })).toBe(true);
    });

    it("표 밖이면 false", () => {
      const { editor } = makeEditor({ isActiveTable: false });
      render(<TableToolbar editor={editor} />);
      expect(captured.shouldShow?.({ editor, state: { selection: textSelection(true) } })).toBe(
        false,
      );
    });

    it("표 안이라도 텍스트가 선택되어 있으면 false — 텍스트 BubbleMenu 에게 흐름을 넘긴다", () => {
      const { editor } = makeEditor();
      render(<TableToolbar editor={editor} />);
      expect(captured.shouldShow?.({ editor, state: { selection: textSelection(false) } })).toBe(
        false,
      );
    });

    it("read-only 모드 (isEditable=false) 에서는 false — 액션 자체가 의미 없다", () => {
      const { editor } = makeEditor({ isEditable: false });
      render(<TableToolbar editor={editor} />);
      expect(captured.shouldShow?.({ editor, state: { selection: textSelection(true) } })).toBe(
        false,
      );
    });
  });

  it.each([
    { label: "행 위 삽입", key: "addRowBefore" as const },
    { label: "행 아래 삽입", key: "addRowAfter" as const },
    { label: "열 좌측 삽입", key: "addColumnBefore" as const },
    { label: "열 우측 삽입", key: "addColumnAfter" as const },
    { label: "현재 행 삭제", key: "deleteRow" as const },
    { label: "현재 열 삭제", key: "deleteColumn" as const },
    { label: "헤더 행 토글", key: "toggleHeaderRow" as const },
    { label: "표 삭제", key: "deleteTable" as const },
  ])("$label 버튼 클릭 시 chain().focus().$key().run() 을 호출한다", async ({ label, key }) => {
    const user = userEvent.setup();
    const { editor, calls } = makeEditor();
    render(<TableToolbar editor={editor} />);

    await user.click(screen.getByRole("button", { name: label }));
    expect(calls.focus).toHaveBeenCalledTimes(1);
    expect(calls[key]).toHaveBeenCalledTimes(1);
    expect(calls.run).toHaveBeenCalledTimes(1);
  });

  it("모든 버튼은 액션 버튼이라 aria-pressed 신호를 노출하지 않는다", () => {
    const { editor } = makeEditor();
    render(<TableToolbar editor={editor} />);
    for (const label of ["행 위 삽입", "헤더 행 토글", "표 삭제"]) {
      expect(screen.getByRole("button", { name: label })).not.toHaveAttribute("aria-pressed");
    }
  });
});

describe("getTableVirtualElement", () => {
  function makeEditorWithDomAtPos(node: Node | null, isActiveTable = true): Editor {
    return {
      state: { selection: { from: 1 } },
      view: {
        domAtPos: () => ({ node, offset: 0 }),
      },
      isActive: (name: string) => name === "table" && isActiveTable,
    } as unknown as Editor;
  }

  it("caret 이 표 안일 때 closest('table') 의 bounding rect 를 노출한다", () => {
    const table = document.createElement("table");
    const td = document.createElement("td");
    table.appendChild(td);
    document.body.appendChild(table);

    const editor = makeEditorWithDomAtPos(td);
    const ve = getTableVirtualElement(editor);
    expect(ve).not.toBeNull();
    expect(ve?.contextElement).toBe(table);
    expect(typeof ve?.getBoundingClientRect).toBe("function");
    expect(ve?.getBoundingClientRect()).toBeDefined();

    document.body.removeChild(table);
  });

  it("editor.isActive('table') 가 false 면 즉시 null 반환 — transition frame race 방어", () => {
    const td = document.createElement("td");
    const table = document.createElement("table");
    table.appendChild(td);
    document.body.appendChild(table);

    const editor = makeEditorWithDomAtPos(td, false);
    expect(getTableVirtualElement(editor)).toBeNull();

    document.body.removeChild(table);
  });

  it("DOM 이 table 의 자손이 아니면 null 을 반환한다", () => {
    const orphan = document.createElement("p");
    document.body.appendChild(orphan);

    const editor = makeEditorWithDomAtPos(orphan);
    expect(getTableVirtualElement(editor)).toBeNull();

    document.body.removeChild(orphan);
  });
});
