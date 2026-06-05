import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

const { apiFetchServerMock, cookiesMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  apiFetchServerMock: vi.fn(),
  cookiesMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/api/server", () => ({
  apiFetchServer: apiFetchServerMock,
}));
vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));
vi.mock("./_components/PageReadingView", () => ({
  PageReadingView: () => null,
}));

import PageReadingRoute from "./page";

function params(pageId: string): Promise<{ pageId: string }> {
  return Promise.resolve({ pageId });
}

beforeEach(() => {
  apiFetchServerMock.mockReset();
  cookiesMock.mockReset();
  notFoundMock.mockClear();
  redirectMock.mockClear();
  cookiesMock.mockResolvedValue({ get: () => undefined });
});

describe("PageReadingRoute — 글로벌 에러 분기", () => {
  it("401 이면 /login?redirect=... 으로 redirect", async () => {
    apiFetchServerMock.mockRejectedValue(
      new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다."),
    );

    await expect(PageReadingRoute({ params: params("p_1") })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fpages%2Fp_1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("403 이면 notFound() — PRIVATE 페이지 존재를 노출하지 않음", async () => {
    apiFetchServerMock.mockRejectedValue(new ApiError(403, "FORBIDDEN", "권한이 없습니다."));

    await expect(PageReadingRoute({ params: params("p_2") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("404 이면 notFound()", async () => {
    apiFetchServerMock.mockRejectedValue(
      new ApiError(404, "PAGE_NOT_FOUND", "페이지를 찾을 수 없습니다."),
    );

    await expect(PageReadingRoute({ params: params("p_3") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("그 외 ApiError 는 throw — 글로벌 error boundary 가 받음", async () => {
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    apiFetchServerMock.mockRejectedValue(error);

    await expect(PageReadingRoute({ params: params("p_4") })).rejects.toBe(error);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
