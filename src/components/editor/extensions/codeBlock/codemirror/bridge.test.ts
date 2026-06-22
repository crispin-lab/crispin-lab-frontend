import { ChangeSet, EditorState } from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";
import type { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";

import {
  dispatchCmChangesToPm,
  FROM_CM_META,
  fromPmAnnotation,
  isFromPm,
  syncPmTextToCm,
} from "./bridge";

/*
 * Bridge 의 회귀 가드 — 실제 PM editor 인스턴스 없이 mocked editor 로 PM tr 호출 순서를 단언.
 * CM 의 ChangeSet 은 실 라이브러리를 사용 (`ChangeSet.of` + `EditorState.create`) 해 iterChanges 동작이 실제와 동일.
 */

type Step =
  | { type: "delete"; from: number; to: number }
  | { type: "replace"; from: number; to: number; text: string };

function makeMockEditor() {
  const steps: Step[] = [];
  const setMeta = vi.fn();
  const tr = {
    delete(from: number, to: number) {
      steps.push({ type: "delete", from, to });
      return tr;
    },
    replaceWith(from: number, to: number, node: { text: string }) {
      steps.push({ type: "replace", from, to, text: node.text });
      return tr;
    },
    setMeta,
  };
  const schema = { text: (text: string) => ({ text }) };
  const dispatch = vi.fn();
  const editor = {
    view: {
      state: { tr, schema },
      dispatch,
    },
  } as unknown as Editor;
  return { editor, steps, dispatch, setMeta };
}

function makeUpdate({
  changes,
  docChanged = true,
  fromPm = false,
}: {
  changes: ChangeSet;
  docChanged?: boolean;
  fromPm?: boolean;
}): ViewUpdate {
  const state = EditorState.create({ doc: "" });
  const tx = fromPm ? state.update({ annotations: fromPmAnnotation.of(true) }) : state.update({});
  return {
    docChanged,
    changes,
    transactions: [tx],
  } as unknown as ViewUpdate;
}

describe("dispatchCmChangesToPm", () => {
  it("docChanged=false 면 dispatch 안 함", () => {
    const { editor, dispatch } = makeMockEditor();
    const changes = ChangeSet.empty(5);
    dispatchCmChangesToPm({
      editor,
      getPos: () => 10,
      update: makeUpdate({ changes, docChanged: false }),
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("fromPm annotation 이 있으면 reentry guard 로 dispatch 안 함", () => {
    const { editor, dispatch } = makeMockEditor();
    const changes = ChangeSet.of({ from: 0, to: 0, insert: "x" }, 0);
    dispatchCmChangesToPm({
      editor,
      getPos: () => 10,
      update: makeUpdate({ changes, fromPm: true }),
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("getPos 가 undefined 면 dispatch 안 함 (노드가 사라지는 중)", () => {
    const { editor, dispatch } = makeMockEditor();
    const changes = ChangeSet.of({ from: 0, to: 0, insert: "x" }, 0);
    dispatchCmChangesToPm({
      editor,
      getPos: () => undefined,
      update: makeUpdate({ changes }),
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("insert: PM offset = pos + 1, schema.text 로 replaceWith", () => {
    const { editor, dispatch, steps } = makeMockEditor();
    const changes = ChangeSet.of({ from: 0, to: 0, insert: "abc" }, 5);
    dispatchCmChangesToPm({ editor, getPos: () => 10, update: makeUpdate({ changes }) });
    expect(steps).toEqual([{ type: "replace", from: 11, to: 11, text: "abc" }]);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("빈 insert + from<to 는 tr.delete (schema.text('') invalid 회피)", () => {
    const { editor, steps } = makeMockEditor();
    const changes = ChangeSet.of({ from: 0, to: 3, insert: "" }, 5);
    dispatchCmChangesToPm({ editor, getPos: () => 10, update: makeUpdate({ changes }) });
    expect(steps).toEqual([{ type: "delete", from: 11, to: 14 }]);
  });

  it("두 개 변경에 prior step 의 length delta 가 offset 으로 누적", () => {
    const { editor, steps } = makeMockEditor();
    // OLD CM doc: "01234567890" (length 11)
    // 변경 1: pos 0 에 "ab" insert (delta +2)
    // 변경 2: OLD pos 5..6 의 1 char delete (delta -1) — 누적 offset 은 +2
    const changes = ChangeSet.of(
      [
        { from: 0, to: 0, insert: "ab" },
        { from: 5, to: 6, insert: "" },
      ],
      11,
    );
    dispatchCmChangesToPm({ editor, getPos: () => 10, update: makeUpdate({ changes }) });
    // PM offset 시작: 10 + 1 = 11
    // step 1: from = 11 + 0 = 11, to = 11 + 0 = 11 (replace with "ab")
    // 누적 offset = +2
    // step 2: from = 11 + 5 + 2 = 18, to = 11 + 6 + 2 = 19 (delete)
    expect(steps[0]).toMatchObject({ type: "replace", from: 11, to: 11, text: "ab" });
    expect(steps[1]).toMatchObject({ type: "delete", from: 18, to: 19 });
  });

  it("FROM_CM_META 가 transaction 에 박혀 PM 측 reentry guard 가 가능", () => {
    const { editor, setMeta } = makeMockEditor();
    const changes = ChangeSet.of({ from: 0, to: 0, insert: "x" }, 0);
    dispatchCmChangesToPm({ editor, getPos: () => 10, update: makeUpdate({ changes }) });
    expect(setMeta).toHaveBeenCalledWith(FROM_CM_META, true);
  });
});

describe("syncPmTextToCm", () => {
  it("같은 텍스트면 dispatch 하지 않고 false 반환 (focus / selection 보존)", () => {
    const dispatch = vi.fn();
    const cmView = {
      state: { doc: { toString: () => "hello", length: 5 } },
      dispatch,
    } as unknown as Parameters<typeof syncPmTextToCm>[0]["cmView"];
    expect(syncPmTextToCm({ cmView, newText: "hello" })).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("다른 텍스트면 fromPm annotation 으로 dispatch + true 반환", () => {
    const dispatch = vi.fn();
    const cmView = {
      state: { doc: { toString: () => "old", length: 3 } },
      dispatch,
    } as unknown as Parameters<typeof syncPmTextToCm>[0]["cmView"];
    expect(syncPmTextToCm({ cmView, newText: "new content" })).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const arg = dispatch.mock.calls[0][0];
    expect(arg.changes).toEqual({ from: 0, to: 3, insert: "new content" });
    expect(arg.annotations).toBeDefined();
  });
});

describe("isFromPm", () => {
  it("어떤 transaction 에 fromPm annotation 이 true 면 true", () => {
    const state = EditorState.create({ doc: "" });
    const tx = state.update({ annotations: fromPmAnnotation.of(true) });
    expect(isFromPm([tx])).toBe(true);
  });

  it("annotation 이 없으면 false", () => {
    const state = EditorState.create({ doc: "" });
    const tx = state.update({});
    expect(isFromPm([tx])).toBe(false);
  });

  it("빈 transactions 면 false", () => {
    expect(isFromPm([])).toBe(false);
  });
});
