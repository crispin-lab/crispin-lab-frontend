import { describe, expect, it } from "vitest";

import { asSpaceId } from "@/lib/api/ids";

import { buildSearchUrl, parseSearchParams } from "./searchParams";

function searchParamsFrom(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

function searchParamsFromList(pairs: Array<[string, string]>): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of pairs) search.append(key, value);
  return search;
}

describe("parseSearchParams", () => {
  it("모든 키 누락 시 빈 객체를 반환한다", () => {
    expect(parseSearchParams(searchParamsFrom({}))).toEqual({});
  });

  it("query 만 있으면 query 만 채운다", () => {
    expect(parseSearchParams(searchParamsFrom({ query: "위키" }))).toEqual({ query: "위키" });
  });

  it("query 가 공백뿐이면 undefined 로 떨군다", () => {
    expect(parseSearchParams(searchParamsFrom({ query: "   " }))).toEqual({});
  });

  it("space 가 있으면 SpaceId 로 lift 한다", () => {
    expect(parseSearchParams(searchParamsFrom({ space: "s_abc" }))).toEqual({
      spaceId: asSpaceId("s_abc"),
    });
  });

  it("space 가 빈 문자열이면 무시한다", () => {
    expect(parseSearchParams(searchParamsFrom({ space: "" }))).toEqual({});
  });

  it("sort=TREE 는 검색 맥락 미허용이라 무시한다", () => {
    expect(parseSearchParams(searchParamsFrom({ sort: "TREE" }))).toEqual({});
  });

  it("sort 가 unknown 이면 무시한다", () => {
    expect(parseSearchParams(searchParamsFrom({ sort: "GARBAGE" }))).toEqual({});
  });

  it("정상 sort 는 그대로 받는다", () => {
    expect(parseSearchParams(searchParamsFrom({ sort: "RELEVANCE" }))).toEqual({
      sort: "RELEVANCE",
    });
  });

  it("page=-1 은 무시한다", () => {
    expect(parseSearchParams(searchParamsFrom({ page: "-1" }))).toEqual({});
  });

  it("page=abc 는 무시한다", () => {
    expect(parseSearchParams(searchParamsFrom({ page: "abc" }))).toEqual({});
  });

  it("정상 page 는 그대로 받는다", () => {
    expect(parseSearchParams(searchParamsFrom({ page: "3" }))).toEqual({ page: 3 });
  });

  it("size 가 1..100 범위 밖이면 무시한다", () => {
    expect(parseSearchParams(searchParamsFrom({ size: "999" }))).toEqual({});
    expect(parseSearchParams(searchParamsFrom({ size: "0" }))).toEqual({});
  });

  it("정상 size 는 그대로 받는다", () => {
    expect(parseSearchParams(searchParamsFrom({ size: "20" }))).toEqual({ size: 20 });
  });

  it("tag 단일 값이 array 로 lift 된다", () => {
    expect(parseSearchParams(searchParamsFrom({ tag: "frontend" }))).toEqual({ tag: ["frontend"] });
  });

  it("tag 가 반복되면 모든 값이 array 로 보존된다", () => {
    expect(
      parseSearchParams(
        searchParamsFromList([
          ["tag", "frontend"],
          ["tag", "wiki"],
        ]),
      ),
    ).toEqual({ tag: ["frontend", "wiki"] });
  });

  it("tag 값이 빈 문자열이면 결과 array 에서 제외된다", () => {
    expect(
      parseSearchParams(
        searchParamsFromList([
          ["tag", ""],
          ["tag", "wiki"],
        ]),
      ),
    ).toEqual({ tag: ["wiki"] });
  });

  it("모든 tag 값이 빈 문자열이면 tag 키 자체가 누락된다", () => {
    expect(parseSearchParams(searchParamsFrom({ tag: "" }))).toEqual({});
  });
});

describe("buildSearchUrl", () => {
  it("빈 current + 빈 patch → /search", () => {
    expect(buildSearchUrl({}, {})).toBe("/search");
  });

  it("query 단일 패치", () => {
    expect(buildSearchUrl({}, { query: "foo" })).toBe("/search?query=foo");
  });

  it("정렬 변경 시 page 는 리셋된다 (URL 에서 제거)", () => {
    expect(buildSearchUrl({ query: "foo", page: 3 }, { sort: "RELEVANCE" })).toBe(
      "/search?query=foo&sort=RELEVANCE",
    );
  });

  it("space 변경 시에도 page 는 리셋된다", () => {
    expect(buildSearchUrl({ query: "foo", page: 5 }, { spaceId: asSpaceId("s_x") })).toBe(
      "/search?query=foo&space=s_x",
    );
  });

  it("size 변경 시에도 page 는 리셋된다", () => {
    expect(buildSearchUrl({ page: 5 }, { size: 50 })).toBe("/search?size=50");
  });

  it("page 만 패치할 때는 그대로 유지된다", () => {
    expect(buildSearchUrl({ query: "foo", page: 3 }, { page: 4 })).toBe("/search?query=foo&page=4");
  });

  it("undefined 패치는 키를 제거한다", () => {
    expect(buildSearchUrl({ query: "foo", sort: "RELEVANCE" }, { sort: undefined })).toBe(
      "/search?query=foo",
    );
  });

  it("한글 query 는 URL 인코딩된다", () => {
    expect(buildSearchUrl({}, { query: "위키" })).toBe("/search?query=%EC%9C%84%ED%82%A4");
  });

  it("tag 단일 값이 URL 에 emit 된다", () => {
    expect(buildSearchUrl({}, { tag: ["frontend"] })).toBe("/search?tag=frontend");
  });

  it("tag 여러 값이 반복 키로 emit 된다", () => {
    expect(buildSearchUrl({}, { tag: ["frontend", "wiki"] })).toBe("/search?tag=frontend&tag=wiki");
  });

  it("tag 변경 시 page 는 리셋된다", () => {
    expect(buildSearchUrl({ tag: ["a"], page: 3 }, { tag: ["b"] })).toBe("/search?tag=b");
  });
});
