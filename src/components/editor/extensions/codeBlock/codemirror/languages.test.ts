import { LanguageSupport } from "@codemirror/language";
import { describe, expect, it } from "vitest";

import { loadLanguageSupport } from "./languages";

describe("loadLanguageSupport", () => {
  it("text 와 mermaid 는 plaintext (빈 extension) 로 매핑", async () => {
    expect(await loadLanguageSupport("text")).toEqual([]);
    expect(await loadLanguageSupport("mermaid")).toEqual([]);
  });

  it("typescript 는 language-data 의 TypeScript LanguageSupport 를 로드", async () => {
    const ext = await loadLanguageSupport("typescript");
    expect(ext.length).toBe(1);
    expect(ext[0]).toBeInstanceOf(LanguageSupport);
  });

  it("주요 언어들이 모두 language-data 의 LanguageSupport 로 매핑된다", async () => {
    // language-data 의 manifest 가 본 매핑을 끊지 않는지의 회귀 가드 — 매핑이 누락되면 빈 배열을 반환하기 때문에 즉시 드러난다.
    const targets = [
      "javascript",
      "tsx",
      "jsx",
      "bash",
      "json",
      "css",
      "html",
      "markdown",
      "sql",
      "python",
      "yaml",
      "java",
      "kotlin",
      "dockerfile",
      "toml",
    ] as const;
    for (const lang of targets) {
      const ext = await loadLanguageSupport(lang);
      expect(ext.length, `${lang} should map to a LanguageSupport`).toBe(1);
      expect(ext[0]).toBeInstanceOf(LanguageSupport);
    }
  });
});
