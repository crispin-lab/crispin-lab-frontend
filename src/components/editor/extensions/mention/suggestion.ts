import { type Editor, ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

import type { UserSummary } from "@/lib/api/types";
import { searchUsers } from "@/lib/api/user";

import {
  MentionUserList,
  type MentionUserListHandle,
  type MentionUserSelection,
} from "../../MentionUserList";

export const DEBOUNCE_MS = 150;
export const SUGGESTION_SIZE = 8;

type ClientRectFn = (() => DOMRect | null) | null | undefined;

type SuggestionProps = {
  editor: Editor;
  clientRect?: ClientRectFn;
  items: UserSummary[];
  command: (selection: MentionUserSelection) => void;
};

type DebouncedSearchDeps = {
  search: (
    params: { query: string; size: number },
    signal: AbortSignal,
  ) => Promise<{ items: UserSummary[] }>;
  delayMs?: number;
};

type DebouncedSearch = (query: string) => Promise<UserSummary[]>;

type MentionSuggestion = Omit<SuggestionOptions<UserSummary, MentionUserSelection>, "editor">;

// 빠른 입력 / IME confirm 시 직전 호출의 fetch 는 abort, debounce timer 는 clear, 대기 중인 Promise 는 빈 결과로 종료한다.
// supersede 된 Promise 를 그대로 두면 TipTap suggestion plugin 의 `await items(...)` 가 hang 상태로 누적된다.
export function createDebouncedSearch(deps: DebouncedSearchDeps): DebouncedSearch {
  const delayMs = deps.delayMs ?? DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastController: AbortController | null = null;
  let pendingResolve: ((items: UserSummary[]) => void) | null = null;

  function abortPending(): void {
    if (timer) clearTimeout(timer);
    lastController?.abort();
    pendingResolve?.([]);
    timer = null;
    lastController = null;
    pendingResolve = null;
  }

  return function search(query: string): Promise<UserSummary[]> {
    abortPending();
    if (query === "") return Promise.resolve([]);

    const controller = new AbortController();
    lastController = controller;

    return new Promise<UserSummary[]>((resolve) => {
      pendingResolve = resolve;
      timer = setTimeout(async () => {
        try {
          const result = await deps.search({ query, size: SUGGESTION_SIZE }, controller.signal);
          if (pendingResolve === resolve) {
            pendingResolve = null;
            resolve(result.items);
          }
        } catch {
          if (pendingResolve === resolve) {
            pendingResolve = null;
            resolve([]);
          }
        }
      }, delayMs);
    });
  };
}

function positionPopover(popoverEl: HTMLDivElement | null, clientRect: ClientRectFn): void {
  if (!popoverEl) return;
  const rect = clientRect?.();
  if (!rect) return;
  popoverEl.style.top = `${rect.bottom + window.scrollY}px`;
  popoverEl.style.left = `${rect.left + window.scrollX}px`;
}

type MentionListRenderProps = {
  items: UserSummary[];
  command: SuggestionProps["command"];
};

export function createMentionSuggestion(): MentionSuggestion {
  const debouncedSearch = createDebouncedSearch({ search: searchUsers });

  function toMentionListProps(props: SuggestionProps): MentionListRenderProps {
    return {
      items: props.items,
      command: props.command,
    };
  }

  return {
    char: "@",

    items: ({ query }: { query: string }) => debouncedSearch(query),

    // mention 노드 + trailing space 를 함께 삽입한다. 공백이 없으면 suggestion plugin 이 빈 trigger 로 즉시 재발화한다.
    command: ({
      editor,
      range,
      props,
    }: {
      editor: Editor;
      range: { from: number; to: number };
      props: MentionUserSelection;
    }) => {
      if (props.id === null) return;
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: { userId: props.id, handle: props.label ?? "" },
          },
          { type: "text", text: " " },
        ])
        .run();
    },

    render: () => {
      let component: ReactRenderer<MentionUserListHandle> | null = null;
      let popoverEl: HTMLDivElement | null = null;
      let currentRect: ClientRectFn = null;

      function reposition(): void {
        positionPopover(popoverEl, currentRect);
      }

      function cleanup(): void {
        window.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
        popoverEl?.remove();
        popoverEl = null;
        component?.destroy();
        component = null;
        currentRect = null;
      }

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionUserList, {
            props: toMentionListProps(props),
            editor: props.editor,
          });
          if (!component.element) return;

          popoverEl = document.createElement("div");
          popoverEl.dataset.mentionSuggestion = "";
          popoverEl.style.position = "absolute";
          popoverEl.style.zIndex = "50";
          document.body.appendChild(popoverEl);
          popoverEl.appendChild(component.element);

          currentRect = props.clientRect;
          reposition();
          window.addEventListener("scroll", reposition, true);
          window.addEventListener("resize", reposition);
        },

        onUpdate: (props: SuggestionProps) => {
          component?.updateProps(toMentionListProps(props));
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
}
