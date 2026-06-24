import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { pageBody } from "@/test/fixtures/page";

const { fetchPageServerMock, fetchMeServerMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  fetchPageServerMock: vi.fn(),
  fetchMeServerMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/api/page.server", () => ({
  fetchPageServer: fetchPageServerMock,
}));
vi.mock("@/lib/api/auth.server", () => ({
  fetchMeServer: fetchMeServerMock,
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));
vi.mock("./_components/PageEditView", () => ({
  PageEditView: () => null,
}));

import PageEditRoute from "./page";

const ME: Me = {
  userId: "u_1",
  handle: "tester",
  email: "t@example.com",
  role: "USER",
};

function params(pageId: string): Promise<{ pageId: string }> {
  return Promise.resolve({ pageId });
}

beforeEach(() => {
  fetchPageServerMock.mockReset();
  fetchMeServerMock.mockReset();
  notFoundMock.mockClear();
  redirectMock.mockClear();
});

describe("PageEditRoute — 권한 게이트", () => {
  it("비로그인이면 /login 으로 redirect (pageId 유지) — 페이지 조회조차 시도하지 않는다", async () => {
    fetchMeServerMock.mockResolvedValue(null);

    await expect(PageEditRoute({ params: params("p_1") })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fpages%2Fp_1%2Fedit");
    expect(fetchPageServerMock).not.toHaveBeenCalled();
  });

  it("canEdit: true 면 정상 진입한다", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchPageServerMock.mockResolvedValue(pageBody({ canEdit: true }));

    await PageEditRoute({ params: params("p_1") });

    expect(fetchPageServerMock).toHaveBeenCalledWith("p_1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("canEdit: false 면 notFound() 로 사전 차단 — 마지막 단계 거부 회귀 차단", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchPageServerMock.mockResolvedValue(pageBody({ canEdit: false }));

    await expect(PageEditRoute({ params: params("p_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("401 이면 /login 으로 redirect (fetchMeServer 이후 만료된 race 흡수)", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchPageServerMock.mockRejectedValue(
      new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다."),
    );

    await expect(PageEditRoute({ params: params("p_1") })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fpages%2Fp_1%2Fedit");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("403 이면 notFound() — 권한 부재 = 존재 비노출 흡수", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchPageServerMock.mockRejectedValue(new ApiError(403, "FORBIDDEN", "권한이 없습니다."));

    await expect(PageEditRoute({ params: params("p_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("404 도 notFound() 로 흡수", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchPageServerMock.mockRejectedValue(
      new ApiError(404, "PAGE_NOT_FOUND", "페이지를 찾을 수 없습니다."),
    );

    await expect(PageEditRoute({ params: params("p_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("그 외 ApiError 는 throw — 글로벌 error boundary 가 받음", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    fetchPageServerMock.mockRejectedValue(error);

    await expect(PageEditRoute({ params: params("p_1") })).rejects.toBe(error);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
