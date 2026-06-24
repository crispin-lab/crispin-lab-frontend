import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";

const { notFoundMock, redirectMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

import { handleSsrAccessError } from "./access.server";

beforeEach(() => {
  notFoundMock.mockClear();
  redirectMock.mockClear();
});

describe("handleSsrAccessError", () => {
  it("401 이면 /login?redirect=<returnPath> 로 redirect", () => {
    const error = new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다.");
    expect(() => handleSsrAccessError(error, "/pages/p_1")).toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fpages%2Fp_1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("403 이면 notFound() — 권한 부재 = 존재 비노출", () => {
    const error = new ApiError(403, "FORBIDDEN", "권한이 없습니다.");
    expect(() => handleSsrAccessError(error, "/pages/p_2")).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("404 이면 notFound()", () => {
    const error = new ApiError(404, "PAGE_NOT_FOUND", "페이지를 찾을 수 없습니다.");
    expect(() => handleSsrAccessError(error, "/pages/p_3")).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("그 외 ApiError 는 그대로 throw", () => {
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    expect(() => handleSsrAccessError(error, "/pages/p_4")).toThrow(error);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ApiError 가 아니면 그대로 throw", () => {
    const error = new TypeError("network down");
    expect(() => handleSsrAccessError(error, "/pages/p_5")).toThrow(error);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
