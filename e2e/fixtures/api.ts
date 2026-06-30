import type { APIRequestContext, Page } from "@playwright/test";

type LoginMock = { ok?: true } | { ok: false; code: string; message: string };

export async function mockLogin(page: Page, options: LoginMock = {}): Promise<void> {
  await page.route("**/api/auth/login", async (route) => {
    if (options.ok === false) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: options.code, message: options.message }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

// SSR (apiFetchServer) 호출은 Node 안에서 일어나 page.route 로 가로챌 수 없다. mock-backend 가 BACKEND_URL
// 로 떠 있고, 본 헬퍼는 그 mock-backend 의 in-memory handler map 을 박는다.
import { MOCK_BACKEND_URL } from "../mock-backend/url";

type MockMethod = "GET" | "POST" | "PUT" | "DELETE";
type MockResponse = { status?: number; body?: unknown };

export async function configureMock(
  request: APIRequestContext,
  method: MockMethod,
  path: string,
  response: MockResponse,
): Promise<void> {
  const result = await request.post(`${MOCK_BACKEND_URL}/__configure`, {
    data: { key: `${method} ${path}`, response },
  });
  if (!result.ok()) {
    throw new Error(`mock-backend configure 실패 (${result.status()})`);
  }
}

export async function resetMocks(request: APIRequestContext): Promise<void> {
  await request.delete(`${MOCK_BACKEND_URL}/__configure`);
}
