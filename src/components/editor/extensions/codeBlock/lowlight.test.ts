import { describe, expect, it } from "vitest";

import { normalizeLanguage } from "./lowlight";

describe("normalizeLanguage", () => {
  it("지원 목록 (UI whitelist) 에 있는 값은 그대로 통과한다", () => {
    expect(normalizeLanguage("typescript")).toBe("typescript");
    expect(normalizeLanguage("bash")).toBe("bash");
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
