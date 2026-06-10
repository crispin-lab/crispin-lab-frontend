import { describe, expect, it } from "vitest";

import { buildPageWindow } from "./SearchPagination";

describe("buildPageWindow", () => {
  it("totalPages=2 / current=0 → [0, 1]", () => {
    expect(buildPageWindow(0, 2)).toEqual([0, 1]);
  });

  it("totalPages=2 / current=1 → [0, 1]", () => {
    expect(buildPageWindow(1, 2)).toEqual([0, 1]);
  });

  it("totalPages=5 / current=0 → ellipsis 없이 [0, 1, 2, 3, 4]", () => {
    expect(buildPageWindow(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("totalPages=10 / current=0 → [0, 1, 2, ellipsis-end, 9]", () => {
    expect(buildPageWindow(0, 10)).toEqual([0, 1, 2, "ellipsis-end", 9]);
  });

  it("totalPages=10 / current=9 → [0, ellipsis-start, 7, 8, 9]", () => {
    expect(buildPageWindow(9, 10)).toEqual([0, "ellipsis-start", 7, 8, 9]);
  });

  it("totalPages=100 / current=50 → 양쪽 ellipsis + anchor", () => {
    expect(buildPageWindow(50, 100)).toEqual([
      0,
      "ellipsis-start",
      48,
      49,
      50,
      51,
      52,
      "ellipsis-end",
      99,
    ]);
  });

  it("뒤 가려진 페이지가 1 개뿐이면 ellipsis 대신 그 페이지를 직접 노출", () => {
    expect(buildPageWindow(6, 10)).toEqual([0, "ellipsis-start", 4, 5, 6, 7, 8, 9]);
  });

  it("앞 가려진 페이지가 0 개면 ellipsis-start 없이 0 만 anchor", () => {
    expect(buildPageWindow(3, 10)).toEqual([0, 1, 2, 3, 4, 5, "ellipsis-end", 9]);
  });

  it("앞 가려진 페이지가 정확히 1 개면 그 페이지를 직접 노출", () => {
    expect(buildPageWindow(4, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, "ellipsis-end", 9]);
  });
});
