import { describe, expect, it } from "vitest";

import { filterSlashItems, SLASH_ITEMS } from "./items";

describe("filterSlashItems", () => {
  it("빈 query 는 전체 목록을 반환한다", () => {
    expect(filterSlashItems("")).toHaveLength(SLASH_ITEMS.length);
    expect(filterSlashItems("   ")).toHaveLength(SLASH_ITEMS.length);
  });

  it("label 부분 일치 매칭 — '제목' 으로 h1/h2/h3 모두 잡힌다", () => {
    const result = filterSlashItems("제목");
    expect(result.map((i) => i.key)).toEqual(
      expect.arrayContaining(["heading-1", "heading-2", "heading-3"]),
    );
  });

  it("키워드 매칭 — 'todo' 가 task-list 를 잡는다", () => {
    const result = filterSlashItems("todo");
    expect(result.map((i) => i.key)).toContain("task-list");
  });

  it("kebab key 매칭 — 'callout' 이 callout 3 종 모두 매칭", () => {
    const result = filterSlashItems("callout");
    expect(result.map((i) => i.key)).toEqual(
      expect.arrayContaining(["callout-info", "callout-warn", "callout-tip"]),
    );
  });

  it("일치 없음 — 빈 배열", () => {
    expect(filterSlashItems("xxx-no-match")).toEqual([]);
  });

  it("대소문자 무시", () => {
    const lower = filterSlashItems("table");
    const upper = filterSlashItems("TABLE");
    expect(lower.map((i) => i.key)).toEqual(upper.map((i) => i.key));
  });

  it("모든 항목은 고유 key 를 가진다", () => {
    const keys = SLASH_ITEMS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
