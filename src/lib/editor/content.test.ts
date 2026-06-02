import { describe, expect, it } from "vitest";

import { emptyEditorContent, parseEditorContent, serializeEditorContent } from "./content";

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
