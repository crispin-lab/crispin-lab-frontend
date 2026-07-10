import { type Editor, ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

import { searchMentionCandidates } from "@/lib/api/mention";
import type { MentionCandidateResult, MentionCandidateSummary } from "@/lib/api/types";
import type { MentionContext } from "@/lib/mention/context";

import {
  MENTION_USER_LISTBOX_ID,
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
  items: MentionCandidateSummary[];
  command: (selection: MentionUserSelection) => void;
};

type DebouncedSearchDeps = {
  search: (
    params: { query: string; size: number; context: MentionContext },
    signal: AbortSignal,
  ) => Promise<MentionCandidateResult>;
  getContext: () => MentionContext | null;
  delayMs?: number;
};

type DebouncedSearch = (query: string) => Promise<MentionCandidateSummary[]>;

type MentionSuggestion = Omit<
  SuggestionOptions<MentionCandidateSummary, MentionUserSelection>,
  "editor"
>;

// 빠른 입력 / IME confirm 시 직전 호출의 fetch 는 abort, debounce timer 는 clear, 대기 중인 Promise 는 빈 결과로 종료한다.
// supersede 된 Promise 를 그대로 두면 TipTap suggestion plugin 의 `await items(...)` 가 hang 상태로 누적된다.
export function createDebouncedSearch(deps: DebouncedSearchDeps): DebouncedSearch {
  const delayMs = deps.delayMs ?? DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastController: AbortController | null = null;
  let pendingResolve: ((items: MentionCandidateSummary[]) => void) | null = null;

  function abortPending(): void {
    if (timer) clearTimeout(timer);
    lastController?.abort();
    pendingResolve?.([]);
    timer = null;
    lastController = null;
    pendingResolve = null;
  }

  return function search(query: string): Promise<MentionCandidateSummary[]> {
    abortPending();
    if (query === "") return Promise.resolve([]);

    const context = deps.getContext();
    if (context === null) return Promise.resolve([]);

    const controller = new AbortController();
    lastController = controller;

    return new Promise<MentionCandidateSummary[]>((resolve) => {
      pendingResolve = resolve;
      timer = setTimeout(async () => {
        try {
          const result = await deps.search(
            { query, size: SUGGESTION_SIZE, context },
            controller.signal,
          );
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

type SuggestionDeps = {
  getMentionContext: () => MentionContext | null;
  onRefreshAvailable?: (refresh: () => void) => void;
};

type MentionListRenderProps = {
  items: MentionCandidateSummary[];
  command: SuggestionProps["command"];
  mentionContext: MentionContext | null;
  onActiveOptionIdChange: (activeOptionId: string | null) => void;
};

export function createMentionSuggestion({
  getMentionContext,
  onRefreshAvailable,
}: SuggestionDeps): MentionSuggestion {
  const debouncedSearch = createDebouncedSearch({
    search: searchMentionCandidates,
    getContext: getMentionContext,
  });

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
      let editorDom: HTMLElement | null = null;
      let lastProps: SuggestionProps | null = null;

      function reposition(): void {
        positionPopover(popoverEl, currentRect);
      }

      function syncActiveDescendant(activeOptionId: string | null): void {
        if (!editorDom) return;
        if (activeOptionId !== null) {
          editorDom.setAttribute("aria-activedescendant", activeOptionId);
        } else {
          editorDom.removeAttribute("aria-activedescendant");
        }
      }

      function toMentionListProps(props: SuggestionProps): MentionListRenderProps {
        return {
          items: props.items,
          command: props.command,
          mentionContext: getMentionContext(),
          onActiveOptionIdChange: syncActiveDescendant,
        };
      }

      // visibility · pageAuthorId 가 바뀌면 상위에서 refresh 를 호출한다. 여기서는 열려 있는 popover 의
      // 렌더 props (empty 힌트 문구가 새 pageVisibility 를 반영) 만 갱신하고, 결과 items 재fetch 는 다음
      // keystroke 의 debouncedSearch 에 위임한다 — visibility toggle UI 는 popover-form 이라
      // mention popover 가 열린 채 visibility 가 바뀌는 순간은 실무적으로 나타나지 않는다.
      onRefreshAvailable?.(() => {
        if (component != null && lastProps != null) {
          component.updateProps(toMentionListProps(lastProps));
        }
      });

      function cleanup(): void {
        window.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
        popoverEl?.remove();
        popoverEl = null;
        component?.destroy();
        component = null;
        currentRect = null;
        lastProps = null;
        if (editorDom) {
          editorDom.removeAttribute("aria-activedescendant");
          editorDom.removeAttribute("aria-controls");
          editorDom.removeAttribute("aria-expanded");
          editorDom = null;
        }
      }

      return {
        onStart: (props: SuggestionProps) => {
          lastProps = props;
          editorDom = props.editor.view.dom;
          editorDom.setAttribute("aria-controls", MENTION_USER_LISTBOX_ID);
          editorDom.setAttribute("aria-expanded", "true");

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
          lastProps = props;
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
