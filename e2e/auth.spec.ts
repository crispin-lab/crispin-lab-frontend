import { expect, test } from "@playwright/test";

import { mockLogin, resetMocks } from "./fixtures/api";

test.describe("/login", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("올바른 자격 증명으로 제출하면 위키 루트로 이동한다", async ({ page }) => {
    await mockLogin(page);

    await page.goto("/login");
    await page.getByLabel("이메일").fill("user@example.com");
    await page.getByLabel("비밀번호").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "로그인" }).click();

    await page.waitForURL((url) => new URL(url).pathname === "/");
  });

  test("잘못된 자격 증명이면 Sonner toast 로 메시지가 노출된다", async ({ page }) => {
    const errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
    await mockLogin(page, { ok: false, code: "INVALID_CREDENTIALS", message: errorMessage });

    await page.goto("/login");
    await page.getByLabel("이메일").fill("user@example.com");
    await page.getByLabel("비밀번호").fill("wrong-password");
    await page.getByRole("button", { name: "로그인" }).click();

    const toast = page.locator("[data-sonner-toast]").filter({ hasText: errorMessage });
    await expect(toast).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
  });
});
