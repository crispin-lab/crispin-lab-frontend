import { describe, expect, it, vi } from "vitest";

import { handleCommentEditorKeyDown } from "./CommentEditor";

function makeEvent(init: KeyboardEventInit & { isComposing?: boolean } = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", init);
  if (init.isComposing) {
    Object.defineProperty(event, "isComposing", { value: true });
  }
  vi.spyOn(event, "preventDefault");
  return event;
}

describe("handleCommentEditorKeyDown", () => {
  it("Enter 만 눌리면 onSubmitShortcut 호출 + preventDefault", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter" });

    const handled = handleCommentEditorKeyDown(event, submit);

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("Shift+Enter 는 통과해 hardBreak 로 흐르게 한다", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", shiftKey: true });

    const handled = handleCommentEditorKeyDown(event, submit);

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("Cmd+Enter 는 저장 발화 (기존 정책 유지)", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", metaKey: true });

    const handled = handleCommentEditorKeyDown(event, submit);

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Enter 는 저장 발화 (Windows / Linux)", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", ctrlKey: true });

    const handled = handleCommentEditorKeyDown(event, submit);

    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("IME 조합 중 Enter 는 저장을 발화하지 않는다", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", isComposing: true });

    const handled = handleCommentEditorKeyDown(event, submit);

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("onSubmitShortcut 이 undefined 이면 Enter 를 통과시킨다", () => {
    const event = makeEvent({ key: "Enter" });

    const handled = handleCommentEditorKeyDown(event, undefined);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("Enter 외 키는 통과시킨다", () => {
    const submit = vi.fn();
    const event = makeEvent({ key: "a" });

    const handled = handleCommentEditorKeyDown(event, submit);

    expect(handled).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
