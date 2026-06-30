import { expect, test } from "@playwright/test";

import { configureMock, resetMocks } from "./fixtures/api";

test.describe("visibility cascade (LAB-122/123)", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("권한 없는 사용자에게 backend 403 은 404 로 흡수된다 — 페이지 존재 누출 차단", async ({
    page,
    request,
  }) => {
    await configureMock(request, "GET", "/v1/pages/p_internal", {
      status: 403,
      body: { code: "FORBIDDEN", message: "" },
    });

    // `notFound()` 의 HTTP status 는 dev / production 에서 다르게 떨어진다 (dev 200, prod 404) — 본문으로 검증.
    await page.goto("/pages/p_internal");
    await expect(
      page.getByRole("heading", { name: "이 페이지를 찾을 수 없습니다." }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/pages/p_internal");
  });
});
