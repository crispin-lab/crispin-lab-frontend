import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { spaceBody } from "@/test/fixtures/space";

const { fetchSpaceServerMock, hasSessionCookieMock, notFoundMock, redirectMock } = vi.hoisted(
  () => ({
    fetchSpaceServerMock: vi.fn(),
    hasSessionCookieMock: vi.fn(),
    notFoundMock: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
  }),
);

vi.mock("@/lib/api/space.server", () => ({
  fetchSpaceServer: fetchSpaceServerMock,
}));
vi.mock("@/lib/auth/session", () => ({
  hasSessionCookie: hasSessionCookieMock,
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));
vi.mock("./_components/SpaceDetailView", () => ({
  SpaceDetailView: () => null,
}));

import SpaceDetailRoute from "./page";

function params(spaceId: string): Promise<{ spaceId: string }> {
  return Promise.resolve({ spaceId });
}

beforeEach(() => {
  fetchSpaceServerMock.mockReset();
  hasSessionCookieMock.mockReset();
  notFoundMock.mockClear();
  redirectMock.mockClear();
});

describe("SpaceDetailRoute — SSR 게이트", () => {
  it("정상 응답이면 SpaceDetailView 에 initialSpace + isAuthenticated 를 전달한다", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    const space = spaceBody({ canWrite: true });
    fetchSpaceServerMock.mockResolvedValue(space);

    const result = await SpaceDetailRoute({ params: params("s_1") });

    expect(fetchSpaceServerMock).toHaveBeenCalledWith("s_1", { allowAnonymousFallback: true });
    expect(result.props.spaceId).toBe("s_1");
    expect(result.props.isAuthenticated).toBe(true);
    expect(result.props.initialSpace).toBe(space);
  });

  it("비로그인 + PUBLIC 스페이스도 anonymous fallback 으로 통과한다", async () => {
    hasSessionCookieMock.mockResolvedValue(false);
    fetchSpaceServerMock.mockResolvedValue(spaceBody({ canWrite: false }));

    const result = await SpaceDetailRoute({ params: params("s_public") });

    expect(fetchSpaceServerMock).toHaveBeenCalledWith("s_public", {
      allowAnonymousFallback: true,
    });
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result.props.isAuthenticated).toBe(false);
  });

  it("401 이면 /login?redirect=<spaceId path> 로 redirect", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockRejectedValue(
      new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다."),
    );

    await expect(SpaceDetailRoute({ params: params("s_1") })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fspaces%2Fs_1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("403 이면 notFound() — 권한 부재 = 존재 비노출 흡수", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockRejectedValue(new ApiError(403, "FORBIDDEN", "권한이 없습니다."));

    await expect(SpaceDetailRoute({ params: params("s_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("404 도 notFound() 로 흡수", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockRejectedValue(
      new ApiError(404, "SPACE_NOT_FOUND", "스페이스를 찾을 수 없습니다."),
    );

    await expect(SpaceDetailRoute({ params: params("s_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("그 외 ApiError 는 throw — 글로벌 error boundary 가 받음", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    fetchSpaceServerMock.mockRejectedValue(error);

    await expect(SpaceDetailRoute({ params: params("s_1") })).rejects.toBe(error);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
