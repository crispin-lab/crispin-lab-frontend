import type { ResolvedPos } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { describe, expect, it, vi } from "vitest";

import {
  handleCommentEditorKeyDown,
  isEnterConsumedByBlock,
  isSuggestionActive,
} from "./CommentEditor";

function makeEvent(init: KeyboardEventInit & { isComposing?: boolean } = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", init);
  if (init.isComposing) {
    Object.defineProperty(event, "isComposing", { value: true });
  }
  vi.spyOn(event, "preventDefault");
  return event;
}

const NO_GUARDS = { suggestionActive: false, enterConsumedByBlock: false } as const;

describe("handleCommentEditorKeyDown", () => {
  it("Enter 만 눌리면 onSubmitShortcut 호출 + preventDefault", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter" });

    const handled = handleCommentEditorKeyDown(event, submit, NO_GUARDS);

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("Shift+Enter 는 통과해 hardBreak 로 흐르게 한다", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", shiftKey: true });

    const handled = handleCommentEditorKeyDown(event, submit, NO_GUARDS);

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("Cmd+Enter 는 저장 발화 (기존 정책 유지)", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", metaKey: true });

    const handled = handleCommentEditorKeyDown(event, submit, NO_GUARDS);

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Enter 는 저장 발화 (Windows / Linux)", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", ctrlKey: true });

    const handled = handleCommentEditorKeyDown(event, submit, NO_GUARDS);

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("IME 조합 중 Enter 는 저장을 발화하지 않는다", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", isComposing: true });

    const handled = handleCommentEditorKeyDown(event, submit, NO_GUARDS);

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("onSubmitShortcut 이 undefined 이면 Enter 를 통과시킨다", () => {
    const event = makeEvent({ key: "Enter" });

    const handled = handleCommentEditorKeyDown(event, undefined, NO_GUARDS);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("Enter 외 키는 통과시킨다", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "a" });

    const handled = handleCommentEditorKeyDown(event, submit, NO_GUARDS);

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("suggestion popover 활성 상태 Enter 는 fall-through", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter" });

    const handled = handleCommentEditorKeyDown(event, submit, {
      suggestionActive: true,
      enterConsumedByBlock: false,
    });

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("list / blockquote / heading 안 Enter 는 fall-through", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter" });

    const handled = handleCommentEditorKeyDown(event, submit, {
      suggestionActive: false,
      enterConsumedByBlock: true,
    });

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("Cmd+Enter 는 suggestion / block context 를 우회하고 저장", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", metaKey: true });

    const handled = handleCommentEditorKeyDown(event, submit, {
      suggestionActive: true,
      enterConsumedByBlock: true,
    });

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Enter 도 guards 를 우회하고 저장", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", ctrlKey: true });

    const handled = handleCommentEditorKeyDown(event, submit, {
      suggestionActive: true,
      enterConsumedByBlock: true,
    });

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

function makeResolvedPos(nodeNamesByDepth: string[]): ResolvedPos {
  return {
    depth: nodeNamesByDepth.length,
    node: (depth: number) => ({ type: { name: nodeNamesByDepth[depth - 1] ?? "doc" } }),
  } as unknown as ResolvedPos;
}

describe("isEnterConsumedByBlock", () => {
  it("paragraph 안이면 false", () => {
    expect(isEnterConsumedByBlock(makeResolvedPos(["paragraph"]))).toBe(false);
  });

  it("listItem 조상이 있으면 true", () => {
    expect(isEnterConsumedByBlock(makeResolvedPos(["bulletList", "listItem", "paragraph"]))).toBe(
      true,
    );
  });

  it("blockquote 조상이 있으면 true", () => {
    expect(isEnterConsumedByBlock(makeResolvedPos(["blockquote", "paragraph"]))).toBe(true);
  });

  it("heading 자체가 부모이면 true", () => {
    expect(isEnterConsumedByBlock(makeResolvedPos(["heading"]))).toBe(true);
  });

  it("doc 루트 (depth 0) 이면 false", () => {
    expect(isEnterConsumedByBlock(makeResolvedPos([]))).toBe(false);
  });
});

function makeView(pluginStates: Array<unknown>): EditorView {
  const state = {
    plugins: pluginStates.map((pluginState) => ({
      getState: () => pluginState,
    })),
  };
  return { state } as unknown as EditorView;
}

describe("isSuggestionActive", () => {
  it("active + range 를 가진 plugin state 가 있으면 true", () => {
    expect(isSuggestionActive(makeView([{ active: true, range: { from: 0, to: 3 } }]))).toBe(true);
  });

  it("active === false 이면 false", () => {
    expect(isSuggestionActive(makeView([{ active: false, range: { from: 0, to: 0 } }]))).toBe(
      false,
    );
  });

  it("active 필드가 있어도 range 가 없으면 false (다른 plugin 오탐 방지)", () => {
    expect(isSuggestionActive(makeView([{ active: true }]))).toBe(false);
  });

  it("plugin state 가 null 이면 false", () => {
    expect(isSuggestionActive(makeView([null]))).toBe(false);
  });

  it("plugin 이 없으면 false", () => {
    expect(isSuggestionActive(makeView([]))).toBe(false);
  });

  it("여러 plugin 중 하나라도 active 면 true", () => {
    expect(
      isSuggestionActive(
        makeView([
          { active: false, range: { from: 0, to: 0 } },
          { active: true, range: { from: 5, to: 8 } },
        ]),
      ),
    ).toBe(true);
  });
});
