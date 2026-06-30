import { expect, test } from "@playwright/test";

import { configureMock, resetMocks } from "./fixtures/api";

test.describe("/pages/new — 권한 게이트 (LAB-133)", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("비로그인 사용자가 직접 진입하면 /login 으로 redirect 된다", async ({ page, request }) => {
    await configureMock(request, "GET", "/v1/users/me", {
      status: 401,
      body: { code: "INVALID_SESSION", message: "" },
    });

    await page.goto("/pages/new");

    await page.waitForURL((url) => new URL(url).pathname === "/login");
    expect(new URL(page.url()).searchParams.get("redirect")).toBe("/pages/new");
  });
});
