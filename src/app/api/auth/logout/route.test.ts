import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

const cookieGet = vi.fn<(name: string) => { value: string } | undefined>();
const cookieDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
    set: vi.fn(),
    delete: cookieDelete,
  })),
}));

const BACKEND_URL = "https://backend.test";

const REQUEST_URL = "https://app.test/api/auth/logout";

async function callLogout(
  options: { fetchSite?: string | null; origin?: string | null } = {},
): Promise<Response> {
  const { POST } = await import("./route");
  const headers = new Headers();
  if (options.fetchSite !== null) {
    headers.set("sec-fetch-site", options.fetchSite ?? "same-origin");
  }
  if (options.origin !== null && options.origin !== undefined) {
    headers.set("origin", options.origin);
  }
  return POST(new Request(REQUEST_URL, { method: "POST", headers }));
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", BACKEND_URL);
    cookieGet.mockReset();
    cookieDelete.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("session cookie 가 있으면 백엔드 DELETE 호출 후 cookie 삭제", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    let receivedAuth: string | null = null;
    server.use(
      http.delete(`${BACKEND_URL}/v1/sessions/me`, ({ request }) => {
        receivedAuth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const response = await callLogout();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(receivedAuth).toBe("Bearer sess_xxx");
    expect(cookieDelete).toHaveBeenCalledWith("session");
  });

  it("session cookie 가 없으면 백엔드 호출 없이 cookie 삭제만 (멱등)", async () => {
    cookieGet.mockReturnValue(undefined);
    const response = await callLogout();

    expect(response.status).toBe(200);
    expect(cookieDelete).toHaveBeenCalledWith("session");
  });

  it("백엔드 호출이 네트워크 실패해도 cookie 는 삭제된다 (best-effort)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    server.use(http.delete(`${BACKEND_URL}/v1/sessions/me`, () => HttpResponse.error()));

    const response = await callLogout();

    expect(response.status).toBe(200);
    expect(cookieDelete).toHaveBeenCalledWith("session");
  });

  it("백엔드가 5xx 를 반환해도 cookie 는 삭제된다 (best-effort 의 5xx 분기)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    server.use(
      http.delete(`${BACKEND_URL}/v1/sessions/me`, () =>
        HttpResponse.json({ code: "INTERNAL" }, { status: 500 }),
      ),
    );

    const response = await callLogout();

    expect(response.status).toBe(200);
    expect(cookieDelete).toHaveBeenCalledWith("session");
  });

  it("BACKEND_URL 미설정이면 백엔드 호출 생략 + cookie 만 삭제", async () => {
    vi.stubEnv("BACKEND_URL", "");
    cookieGet.mockReturnValue({ value: "sess_xxx" });

    const response = await callLogout();

    expect(response.status).toBe(200);
    expect(cookieDelete).toHaveBeenCalledWith("session");
  });

  it("Sec-Fetch-Site 가 cross-site 면 403 CSRF_BLOCKED 로 거부 (cookie 보존)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    const response = await callLogout({ fetchSite: "cross-site" });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "CSRF_BLOCKED" });
    expect(cookieDelete).not.toHaveBeenCalled();
  });

  it("Sec-Fetch-Site 누락 + Origin 이 요청 origin 과 일치하면 통과 (헤더 미지원 환경 fallback)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    server.use(
      http.delete(`${BACKEND_URL}/v1/sessions/me`, () => new HttpResponse(null, { status: 204 })),
    );

    const response = await callLogout({ fetchSite: null, origin: "https://app.test" });

    expect(response.status).toBe(200);
    expect(cookieDelete).toHaveBeenCalledWith("session");
  });

  it("Sec-Fetch-Site 누락 + Origin 도 미일치면 403 (cross-origin form post 류 차단)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    const response = await callLogout({ fetchSite: null, origin: "https://attacker.test" });

    expect(response.status).toBe(403);
    expect(cookieDelete).not.toHaveBeenCalled();
  });

  it("Sec-Fetch-Site / Origin 둘 다 누락이면 403 (정보 0 — 보수적 거부)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    const response = await callLogout({ fetchSite: null, origin: null });

    expect(response.status).toBe(403);
    expect(cookieDelete).not.toHaveBeenCalled();
  });
});
