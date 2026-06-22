import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";

import { filterSlashItems, type SlashItem } from "./items";
import { SlashMenuList, type SlashMenuListHandle } from "./SlashMenuList";

type ClientRectFn = (() => DOMRect | null) | null | undefined;

type SuggestionRenderProps = {
  editor: Editor;
  range: Range;
  clientRect?: ClientRectFn;
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

function positionPopover(popoverEl: HTMLDivElement | null, clientRect: ClientRectFn) {
  if (!popoverEl) return;
  const rect = clientRect?.();
  if (!rect) return;
  popoverEl.style.top = `${rect.bottom + window.scrollY}px`;
  popoverEl.style.left = `${rect.left + window.scrollX}px`;
}

export const slashSuggestion = {
  char: "/",
  startOfLine: false,
  allowSpaces: false,

  items: ({ query }: { query: string }) => filterSlashItems(query),

  command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
    // deleteRange 는 각 item.command 안에서 — slash 흔적 제거 + 본문 action 한 chain.
    props.command({ editor, range });
  },

  render: () => {
    let component: ReactRenderer<SlashMenuListHandle> | null = null;
    let popoverEl: HTMLDivElement | null = null;
    let currentRect: ClientRectFn = null;

    function reposition() {
      positionPopover(popoverEl, currentRect);
    }

    function cleanup() {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      popoverEl?.remove();
      popoverEl = null;
      component?.destroy();
      component = null;
      currentRect = null;
    }

    function buildProps(props: SuggestionRenderProps) {
      return {
        items: props.items,
        onSelect: (item: SlashItem) => props.command(item),
      };
    }

    return {
      onStart: (props: SuggestionRenderProps) => {
        component = new ReactRenderer(SlashMenuList, {
          props: buildProps(props),
          editor: props.editor,
        });
        if (!component.element) return;

        popoverEl = document.createElement("div");
        popoverEl.dataset.slashMenu = "";
        popoverEl.style.position = "absolute";
        popoverEl.style.zIndex = "50";
        document.body.appendChild(popoverEl);
        popoverEl.appendChild(component.element);

        currentRect = props.clientRect;
        reposition();
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
      },

      onUpdate: (props: SuggestionRenderProps) => {
        component?.updateProps(buildProps(props));
        currentRect = props.clientRect;
        reposition();
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          cleanup();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: cleanup,
    };
  },
};
