import { describe, expect, it } from "vitest";

import { buildSortChangePatch, buildSpacesUrl, parseSpaceListSearchParams } from "./listParams";

describe("parseSpaceListSearchParams", () => {
  it("keyword / sort / direction / page 를 각각 narrowing 해 노출한다", () => {
    const raw = new URLSearchParams("keyword=위키&sort=NAME&direction=ASC&page=2");
    expect(parseSpaceListSearchParams(raw)).toEqual({
      keyword: "위키",
      sort: "NAME",
      direction: "ASC",
      page: 2,
    });
  });

  it("공백 keyword 는 무시한다 (BE 필터 미적용 + URL 청결)", () => {
    const raw = new URLSearchParams("keyword=%20%20%20");
    expect(parseSpaceListSearchParams(raw).keyword).toBeUndefined();
  });

  it("허용되지 않은 sort / direction 값은 무시된다 (조작된 URL 방어)", () => {
    const raw = new URLSearchParams("sort=WHATEVER&direction=up");
    const result = parseSpaceListSearchParams(raw);
    expect(result.sort).toBeUndefined();
    expect(result.direction).toBeUndefined();
  });

  it("음수 · 정수 아닌 page 는 무시한다", () => {
    const raw = new URLSearchParams("page=-1");
    expect(parseSpaceListSearchParams(raw).page).toBeUndefined();
    const raw2 = new URLSearchParams("page=1.5");
    expect(parseSpaceListSearchParams(raw2).page).toBeUndefined();
  });
});

describe("buildSpacesUrl", () => {
  it("patch 가 page 리셋 키를 포함하면 page 를 지운다 (결과 변동으로 OOB 되지 않게)", () => {
    const url = buildSpacesUrl({ page: 3, sort: "NAME" }, { keyword: "test" });
    expect(url).toBe("/spaces?keyword=test&sort=NAME");
  });

  it("page 만 바꾸면 page 는 유지된다 (페이지네이션 정상 동작)", () => {
    const url = buildSpacesUrl({ page: 1, sort: "NAME" }, { page: 2 });
    expect(url).toBe("/spaces?sort=NAME&page=2");
  });

  it("빈 결과면 pathname 만 반환 (dangling `?` 없음)", () => {
    expect(buildSpacesUrl({}, {})).toBe("/spaces");
  });

  it("공백 keyword 는 URL 에 남기지 않는다", () => {
    const url = buildSpacesUrl({}, { keyword: "   " });
    expect(url).toBe("/spaces");
  });
});

describe("buildSortChangePatch", () => {
  it("draft 가 URL keyword 와 같으면 sort 만 patch", () => {
    expect(buildSortChangePatch("위키", "위키", "NAME")).toEqual({ sort: "NAME" });
  });

  it("draft 가 URL keyword 와 다르면 sort + keyword 를 함께 patch (debounce race 회귀 방지)", () => {
    expect(buildSortChangePatch("", "위키", "NAME")).toEqual({ sort: "NAME", keyword: "위키" });
    expect(buildSortChangePatch("이전", "새검색", "CREATED_AT")).toEqual({
      sort: "CREATED_AT",
      keyword: "새검색",
    });
  });

  it("draft 가 비어 있는데 URL keyword 가 있으면 keyword 를 함께 지우는 patch (사용자 clear 후 정렬 변경)", () => {
    expect(buildSortChangePatch("위키", "", "NAME")).toEqual({ sort: "NAME", keyword: "" });
  });
});
