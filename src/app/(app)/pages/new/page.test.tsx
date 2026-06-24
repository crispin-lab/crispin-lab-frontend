import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { spaceBody } from "@/test/fixtures/space";

const { fetchSpaceServerMock, fetchMeServerMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  fetchSpaceServerMock: vi.fn(),
  fetchMeServerMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/api/space.server", () => ({
  fetchSpaceServer: fetchSpaceServerMock,
}));
vi.mock("@/lib/api/auth.server", () => ({
  fetchMeServer: fetchMeServerMock,
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));
vi.mock("./_components/NewPageView", () => ({
  NewPageView: () => null,
}));

import NewPageRoute from "./page";

const ME: Me = {
  userId: "u_1",
  handle: "tester",
  email: "t@example.com",
  role: "USER",
};

function searchParams(input: { spaceId?: string }): Promise<{ spaceId?: string }> {
  return Promise.resolve(input);
}

beforeEach(() => {
  fetchSpaceServerMock.mockReset();
  fetchMeServerMock.mockReset();
  notFoundMock.mockClear();
  redirectMock.mockClear();
});

describe("NewPageRoute — 권한 게이트", () => {
  it("비로그인이면 /login 으로 redirect (spaceId 유지)", async () => {
    fetchMeServerMock.mockResolvedValue(null);

    await expect(NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fpages%2Fnew%3FspaceId%3Ds_1");
    expect(fetchSpaceServerMock).not.toHaveBeenCalled();
  });

  it("spaceId 가 없으면 BE 조회 없이 안내 화면을 반환한다", async () => {
    fetchMeServerMock.mockResolvedValue(ME);

    const result = await NewPageRoute({ searchParams: searchParams({}) });

    expect(fetchSpaceServerMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("canWrite: true 면 정상 진입한다", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchSpaceServerMock.mockResolvedValue(spaceBody({ canWrite: true }));

    await NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) });

    expect(fetchSpaceServerMock).toHaveBeenCalledWith("s_1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("canWrite: false 면 notFound() 로 사전 차단 (VIEWER 멤버)", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchSpaceServerMock.mockResolvedValue(spaceBody({ canWrite: false }));

    await expect(NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("401 이면 /login 으로 redirect (fetchMeServer 이후 만료된 race 흡수)", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchSpaceServerMock.mockRejectedValue(
      new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다."),
    );

    await expect(NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fpages%2Fnew%3FspaceId%3Ds_1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("403 이면 notFound() — 권한 부재 = 존재 비노출 흡수", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchSpaceServerMock.mockRejectedValue(new ApiError(403, "FORBIDDEN", "권한이 없습니다."));

    await expect(NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("404 도 notFound() 로 흡수", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    fetchSpaceServerMock.mockRejectedValue(
      new ApiError(404, "SPACE_NOT_FOUND", "스페이스를 찾을 수 없습니다."),
    );

    await expect(NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("그 외 ApiError 는 throw — 글로벌 error boundary 가 받음", async () => {
    fetchMeServerMock.mockResolvedValue(ME);
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    fetchSpaceServerMock.mockRejectedValue(error);

    await expect(NewPageRoute({ searchParams: searchParams({ spaceId: "s_1" }) })).rejects.toBe(
      error,
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
