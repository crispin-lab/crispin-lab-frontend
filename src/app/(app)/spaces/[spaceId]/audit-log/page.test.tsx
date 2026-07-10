import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { spaceBody } from "@/test/fixtures/space";

const {
  fetchSpaceServerMock,
  hasSessionCookieMock,
  notFoundMock,
  redirectMock,
  spaceAuditLogViewMock,
} = vi.hoisted(() => ({
  fetchSpaceServerMock: vi.fn(),
  hasSessionCookieMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  spaceAuditLogViewMock: vi.fn(() => null),
}));

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
vi.mock("./_components/SpaceAuditLogView", () => ({
  SpaceAuditLogView: spaceAuditLogViewMock,
}));

import SpaceAuditLogRoute from "./page";

function params(spaceId: string): Promise<{ spaceId: string }> {
  return Promise.resolve({ spaceId });
}

beforeEach(() => {
  fetchSpaceServerMock.mockReset();
  hasSessionCookieMock.mockReset();
  notFoundMock.mockClear();
  redirectMock.mockClear();
  spaceAuditLogViewMock.mockClear();
});

describe("SpaceAuditLogRoute — SSR 게이트", () => {
  it("비로그인 이면 /login?redirect=<audit-log path> 로 redirect (fetch 조차 하지 않음)", async () => {
    hasSessionCookieMock.mockResolvedValue(false);

    await expect(SpaceAuditLogRoute({ params: params("s_1") })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fspaces%2Fs_1%2Faudit-log");
    expect(fetchSpaceServerMock).not.toHaveBeenCalled();
  });

  it("canEdit 이 false 이면 notFound() — 존재 비노출", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockResolvedValue(spaceBody({ canEdit: false }));

    await expect(SpaceAuditLogRoute({ params: params("s_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fetchSpaceServerMock).toHaveBeenCalledWith("s_1", { allowAnonymousFallback: false });
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("canEdit 이 true 이면 SpaceAuditLogView 를 렌더 (props 에 spaceId · space 전달)", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    const space = spaceBody({ canEdit: true, name: "편집 가능" });
    fetchSpaceServerMock.mockResolvedValue(space);

    renderToStaticMarkup(await SpaceAuditLogRoute({ params: params("s_1") }));

    expect(spaceAuditLogViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: "s_1", space }),
      undefined,
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("403 이면 notFound() — 권한 부재 = 존재 비노출", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockRejectedValue(new ApiError(403, "FORBIDDEN", "권한이 없습니다."));

    await expect(SpaceAuditLogRoute({ params: params("s_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("401 이면 /login?redirect=<audit-log path> 로 redirect (세션 만료)", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockRejectedValue(
      new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다."),
    );

    await expect(SpaceAuditLogRoute({ params: params("s_1") })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fspaces%2Fs_1%2Faudit-log");
  });

  it("404 도 notFound() 로 흡수", async () => {
    hasSessionCookieMock.mockResolvedValue(true);
    fetchSpaceServerMock.mockRejectedValue(
      new ApiError(404, "SPACE_NOT_FOUND", "스페이스를 찾을 수 없습니다."),
    );

    await expect(SpaceAuditLogRoute({ params: params("s_1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
