import { describe, expect, it } from "vitest";

import { isRawPassthroughLanguage, lowlight, normalizeLanguage } from "./lowlight";

describe("normalizeLanguage", () => {
  it("지원 목록 (UI whitelist) 에 있는 값은 그대로 통과한다", () => {
    expect(normalizeLanguage("typescript")).toBe("typescript");
    expect(normalizeLanguage("bash")).toBe("bash");
  });

  it("새로 추가된 언어 6 종도 통과한다", () => {
    expect(normalizeLanguage("python")).toBe("python");
    expect(normalizeLanguage("yaml")).toBe("yaml");
    expect(normalizeLanguage("java")).toBe("java");
    expect(normalizeLanguage("kotlin")).toBe("kotlin");
    expect(normalizeLanguage("dockerfile")).toBe("dockerfile");
    expect(normalizeLanguage("toml")).toBe("toml");
  });

  it("mermaid 는 whitelist 통과하지만 raw passthrough 분기", () => {
    expect(normalizeLanguage("mermaid")).toBe("mermaid");
    expect(isRawPassthroughLanguage("mermaid")).toBe(true);
    expect(isRawPassthroughLanguage("typescript")).toBe(false);
  });

  it("지원 목록에 없는 값은 text 로 fallback 한다", () => {
    expect(normalizeLanguage("rust")).toBe("text");
    expect(normalizeLanguage("")).toBe("text");
  });

  it("문자열이 아니면 text 로 fallback 한다 (legacy JSON 의 language 누락 케이스)", () => {
    expect(normalizeLanguage(undefined)).toBe("text");
    expect(normalizeLanguage(null)).toBe("text");
    expect(normalizeLanguage(42)).toBe("text");
  });
});

describe("lowlight registration", () => {
  it("새로 등록된 언어들이 lowlight 인스턴스에 들어가 있다", () => {
    expect(lowlight.registered("python")).toBe(true);
    expect(lowlight.registered("yaml")).toBe(true);
    expect(lowlight.registered("java")).toBe(true);
    expect(lowlight.registered("kotlin")).toBe(true);
    expect(lowlight.registered("dockerfile")).toBe(true);
    // toml 은 ini grammar 를 toml 키로 alias 등록 — 등록 자체는 통과해야 한다.
    expect(lowlight.registered("toml")).toBe(true);
  });

  it("mermaid 는 lowlight 에 등록되지 않는다 (renderHTML 분기로만 처리)", () => {
    expect(lowlight.registered("mermaid")).toBe(false);
  });
});
