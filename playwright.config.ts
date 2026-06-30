import { defineConfig, devices } from "@playwright/test";

import { MOCK_BACKEND_PORT, MOCK_BACKEND_URL } from "./e2e/mock-backend/url";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  // SSR mock backend 핸들러가 in-memory Map — workers 가 늘면 다른 spec 이 같은 키를 덮어쓴다.
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-backend/server.mjs",
      // mock-backend 는 GET 으로 200 을 주는 경로가 없다 (모든 미설정 경로 404) — port 로 listening 만 확인.
      port: MOCK_BACKEND_PORT,
      reuseExistingServer: !isCI,
      env: { MOCK_BACKEND_PORT: String(MOCK_BACKEND_PORT) },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // CI 는 production build 의 결정론, 로컬은 hot-reload 반복 속도 — 두 환경의 trade-off.
      command: isCI ? "pnpm start" : "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: { BACKEND_URL: MOCK_BACKEND_URL },
    },
  ],
});
