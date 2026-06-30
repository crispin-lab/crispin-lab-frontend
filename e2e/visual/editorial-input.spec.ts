import { expect, test, type Page } from "@playwright/test";

type Theme = "dark" | "light";

// next-themes 가 mount 시 localStorage("theme") 를 읽어 <html> class 를 적용한다 (src/app/providers.tsx).
// 페이지 로드 전 seed 하지 않으면 default "dark" 가 먼저 박힌 뒤 후속 mutation 으로 light 가 덮여
// 첫 paint 와 후속 paint 의 미세 차이가 snapshot 을 흔든다.
async function gotoWithTheme(page: Page, path: string, theme: Theme): Promise<void> {
  await page.addInitScript((next) => {
    window.localStorage.setItem("theme", next);
  }, theme);
  await page.goto(path);
  await page.waitForFunction(
    (expected) => document.documentElement.classList.contains(expected),
    theme,
  );
  await page.evaluate(() => document.fonts.ready);
}

test.describe("EditorialInput — underline-only 시각 회귀", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`${theme} · default + focused snapshot`, async ({ page }) => {
      await gotoWithTheme(page, "/login", theme);

      const emailInput = page.getByLabel("이메일");
      await expect(emailInput).toBeVisible();
      await emailInput.evaluate((el) => el.blur());

      await expect(emailInput).toHaveScreenshot(`editorial-input-${theme}-default.png`);

      await emailInput.focus();
      await expect(emailInput).toBeFocused();
      await expect(emailInput).toHaveScreenshot(`editorial-input-${theme}-focused.png`);
    });
  }
});
