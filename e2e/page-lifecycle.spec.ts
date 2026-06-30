import { expect, test } from "@playwright/test";

import { configureMock, resetMocks } from "./fixtures/api";

const spaceId = "s_lifecycle";

const writableUser = {
  userId: "u_author",
  handle: "author",
  email: "author@test",
  role: "USER",
};

function buildSpace({ canWrite }: { canWrite: boolean }) {
  return {
    spaceId,
    name: "라이프사이클 스페이스",
    visibility: "PUBLIC",
    description: "",
    canWrite,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

test.describe("페이지 생애주기 — /pages/new 진입 게이트", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("canWrite=true 사용자에게 제목·공개 범위 form 이 노출된다", async ({ page, request }) => {
    await configureMock(request, "GET", "/v1/users/me", { body: writableUser });
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, {
      body: buildSpace({ canWrite: true }),
    });

    await page.goto(`/pages/new?spaceId=${spaceId}`);

    await expect(page.getByPlaceholder("제목을 입력해 주세요")).toBeVisible();
    await expect(page.getByLabel("공개 범위")).toBeVisible();
  });

  test("canWrite=false 스페이스로 직접 진입하면 notFound 로 흡수된다", async ({
    page,
    request,
  }) => {
    await configureMock(request, "GET", "/v1/users/me", { body: writableUser });
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, {
      body: buildSpace({ canWrite: false }),
    });

    await page.goto(`/pages/new?spaceId=${spaceId}`);

    await expect(
      page.getByRole("heading", { name: "이 페이지를 찾을 수 없습니다." }),
    ).toBeVisible();
  });
});
