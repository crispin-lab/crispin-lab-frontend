import { describe, expect, it } from "vitest";

import {
  emptyEditorContent,
  isEmptyEditorContent,
  parseEditorContent,
  serializeEditorContent,
} from "./content";

describe("parseEditorContent", () => {
  it("undefined / 빈 문자열은 빈 문서로 fallback 한다", () => {
    expect(parseEditorContent(undefined)).toEqual(emptyEditorContent());
    expect(parseEditorContent("")).toEqual(emptyEditorContent());
  });

  it("손상된 JSON 은 빈 문서로 fallback 한다", () => {
    expect(parseEditorContent("not json")).toEqual(emptyEditorContent());
    expect(parseEditorContent("{")).toEqual(emptyEditorContent());
  });

  it("doc 이 아닌 형태는 빈 문서로 fallback 한다", () => {
    expect(parseEditorContent("[]")).toEqual(emptyEditorContent());
    expect(parseEditorContent("null")).toEqual(emptyEditorContent());
    expect(parseEditorContent('"text"')).toEqual(emptyEditorContent());
    expect(parseEditorContent(JSON.stringify({ type: "paragraph" }))).toEqual(emptyEditorContent());
  });

  it("정상 JSONContent 는 그대로 복원한다", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "안녕" }] }],
    };
    expect(parseEditorContent(JSON.stringify(doc))).toEqual(doc);
  });
});

describe("serializeEditorContent", () => {
  it("JSONContent → string round-trip 이 유지된다", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "round-trip" }] }],
    };
    expect(parseEditorContent(serializeEditorContent(doc))).toEqual(doc);
  });
});

describe("emptyEditorContent", () => {
  it("호출마다 새 객체를 반환해 외부 mutation 으로부터 보호된다", () => {
    const a = emptyEditorContent();
    const b = emptyEditorContent();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("isEmptyEditorContent", () => {
  it("content 가 비어 있거나 부재하면 empty", () => {
    expect(isEmptyEditorContent({ type: "doc" })).toBe(true);
    expect(isEmptyEditorContent({ type: "doc", content: [] })).toBe(true);
  });

  it("단일 빈 paragraph (정규형) 는 empty", () => {
    expect(isEmptyEditorContent(emptyEditorContent())).toBe(true);
    expect(isEmptyEditorContent({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(
      isEmptyEditorContent({ type: "doc", content: [{ type: "paragraph", content: [] }] }),
    ).toBe(true);
  });

  it("텍스트가 있는 paragraph 는 empty 아님", () => {
    expect(
      isEmptyEditorContent({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "안녕" }] }],
      }),
    ).toBe(false);
  });

  it("paragraph 가 두 개 이상이면 empty 아님 (두 번째가 비어 있어도)", () => {
    expect(
      isEmptyEditorContent({
        type: "doc",
        content: [{ type: "paragraph" }, { type: "paragraph" }],
      }),
    ).toBe(false);
  });

  it("inline pageLink 만 있어도 empty 아님 (텍스트 없어도 의미 있는 노드)", () => {
    expect(
      isEmptyEditorContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "pageLink", attrs: { pageId: "p_1", displayText: "회의록" } }],
          },
        ],
      }),
    ).toBe(false);
  });
});
