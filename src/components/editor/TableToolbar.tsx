"use client";

import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import {
  BetweenHorizontalEndIcon,
  BetweenHorizontalStartIcon,
  BetweenVerticalEndIcon,
  BetweenVerticalStartIcon,
  Columns3Icon,
  HeadingIcon,
  Rows3Icon,
  TableCellsMergeIcon,
  TableCellsSplitIcon,
  Trash2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  editor: Editor | null;
};

export function TableToolbar({ editor }: Props) {
  if (!editor) return null;

  const inTable = editor.isActive("table");
  const canMergeCells = inTable && editor.can().mergeCells();
  const canSplitCell = inTable && editor.can().splitCell();

  return (
    <TiptapBubbleMenu
      editor={editor}
      pluginKey="tableToolbar"
      // 표 안 + (CellSelection || empty selection). 텍스트가 드래그 선택되면 mark 용 EditorBubbleMenu 가
      // 그 흐름을 가져가 두 toolbar 동시 노출을 회피. read-only 모드에서는 액션 자체가 의미 없어 isEditable 도 가드.
      shouldShow={({ editor, state }) =>
        editor.isEditable &&
        editor.isActive("table") &&
        (state.selection instanceof CellSelection || state.selection.empty)
      }
      getReferencedVirtualElement={() => getTableVirtualElement(editor)}
      className="border-border bg-surface-elevated text-popover-foreground shadow-accent-glow flex items-center gap-1 rounded-md border p-1"
    >
      <ToolbarButton
        ariaLabel="행 위 삽입"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        <BetweenHorizontalStartIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="행 아래 삽입"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <BetweenHorizontalEndIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="열 좌측 삽입"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        <BetweenVerticalStartIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="열 우측 삽입"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <BetweenVerticalEndIcon className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        ariaLabel="현재 행 삭제"
        variant="destructive"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <Rows3Icon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="현재 열 삭제"
        variant="destructive"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <Columns3Icon className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        ariaLabel="선택한 셀 병합"
        disabled={!canMergeCells}
        onClick={() => editor.chain().focus().mergeCells().run()}
      >
        <TableCellsMergeIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="병합된 셀 분할"
        disabled={!canSplitCell}
        onClick={() => editor.chain().focus().splitCell().run()}
      >
        <TableCellsSplitIcon className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        ariaLabel="헤더 행 토글"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        <HeadingIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="표 삭제"
        variant="destructive"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2Icon className="size-4" />
      </ToolbarButton>
    </TiptapBubbleMenu>
  );
}

function Separator() {
  return <span aria-hidden className="bg-border mx-0.5 h-5 w-px" />;
}

function ToolbarButton({
  children,
  ariaLabel,
  variant = "default",
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded text-sm",
        variant === "destructive" && "hover:bg-destructive/15 hover:text-destructive",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

export function getTableVirtualElement(editor: Editor) {
  if (!editor.isActive("table")) return null;
  const view = editor.view;
  if (!view) return null;
  const { from } = editor.state.selection;
  const resolved = view.domAtPos(from);
  const node = resolved.node;
  const el = node instanceof Element ? node : node.parentElement;
  const tableEl = el?.closest("table");
  if (!tableEl) return null;
  return {
    getBoundingClientRect: () => tableEl.getBoundingClientRect(),
    contextElement: tableEl,
  };
}
