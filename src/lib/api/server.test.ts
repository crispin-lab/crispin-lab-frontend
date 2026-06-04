import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { server } from "@/mocks/server";

const { getCookieMock } = vi.hoisted(() => ({ getCookieMock: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: getCookieMock }),
}));

import { apiFetchServer } from "./server";

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "https://backend.test");
  getCookieMock.mockReset();
  getCookieMock.mockReturnValue(undefined);
});

describe("apiFetchServer", () => {
  it("BACKEND_URL 직접 호출 + 200 응답을 파싱한다", async () => {
    server.use(
      http.get("https://backend.test/v1/pages/p_1", () =>
        HttpResponse.json({ pageId: "p_1", title: "안녕" }),
      ),
    );

    const result = await apiFetchServer<{ pageId: string; title: string }>("/v1/pages/p_1");

    expect(result).toEqual({ pageId: "p_1", title: "안녕" });
  });

  it("session cookie 가 있으면 Authorization Bearer 로 변환한다", async () => {
    getCookieMock.mockImplementation((name: string) =>
      name === SESSION_COOKIE_NAME ? { value: "sess_xxx" } : undefined,
    );
    let captured: string | null = null;
    server.use(
      http.get("https://backend.test/v1/pages/p_1", ({ request }) => {
        captured = request.headers.get("authorization");
        return HttpResponse.json({ pageId: "p_1" });
      }),
    );

    await apiFetchServer("/v1/pages/p_1");

    expect(captured).toBe("Bearer sess_xxx");
  });

  it("session cookie 가 없으면 Authorization 헤더를 부착하지 않는다 (anonymous)", async () => {
    let captured: string | null = "not-set";
    server.use(
      http.get("https://backend.test/v1/pages/p_1", ({ request }) => {
        captured = request.headers.get("authorization");
        return HttpResponse.json({ pageId: "p_1" });
      }),
    );

    await apiFetchServer("/v1/pages/p_1");

    expect(captured).toBeNull();
  });

  it("백엔드 에러 응답을 ApiError 로 lift 한다", async () => {
    server.use(
      http.get("https://backend.test/v1/pages/p_missing", () =>
        HttpResponse.json(
          { code: "PAGE_NOT_FOUND", message: "페이지를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    await expect(apiFetchServer("/v1/pages/p_missing")).rejects.toMatchObject({
      status: 404,
      code: "PAGE_NOT_FOUND",
      message: "페이지를 찾을 수 없습니다.",
    });
  });

  it("응답 body 가 JSON 이 아니면 INVALID_JSON ApiError 로 lift 한다", async () => {
    server.use(
      http.get(
        "https://backend.test/v1/pages/p_broken",
        () => new HttpResponse("not json", { status: 200 }),
      ),
    );

    await expect(apiFetchServer("/v1/pages/p_broken")).rejects.toMatchObject({
      status: 200,
      code: "INVALID_JSON",
    });
  });

  it("204 No Content 응답은 undefined 를 반환한다", async () => {
    server.use(
      http.delete(
        "https://backend.test/v1/pages/p_1",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const result = await apiFetchServer<void>("/v1/pages/p_1", { method: "DELETE" });

    expect(result).toBeUndefined();
  });

  it("'/api/' 로 시작하는 path 는 즉시 던진다 — BFF 가 아닌 백엔드 직접 호출이라는 의도 보호", async () => {
    await expect(apiFetchServer("/api/v1/pages/p_1")).rejects.toThrow(/BACKEND_URL 직접 호출용/);
  });

  it("allowAnonymousFallback=true 면 401 에서 Authorization 없이 재시도해 PUBLIC 응답을 받는다", async () => {
    getCookieMock.mockImplementation((name: string) =>
      name === SESSION_COOKIE_NAME ? { value: "sess_expired" } : undefined,
    );
    const captured: string[] = [];
    server.use(
      http.get("https://backend.test/v1/pages/p_public", ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        captured.push(auth);
        if (auth !== "") {
          return HttpResponse.json(
            { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
            { status: 401 },
          );
        }
        return HttpResponse.json({ pageId: "p_public", visibility: "PUBLIC" });
      }),
    );

    const result = await apiFetchServer<{ pageId: string }>("/v1/pages/p_public", {
      allowAnonymousFallback: true,
    });

    expect(result).toEqual({ pageId: "p_public", visibility: "PUBLIC" });
    expect(captured).toEqual(["Bearer sess_expired", ""]);
  });

  it("allowAnonymousFallback=true 라도 anonymous 재시도가 401 이면 ApiError 를 던진다", async () => {
    getCookieMock.mockImplementation((name: string) =>
      name === SESSION_COOKIE_NAME ? { value: "sess_expired" } : undefined,
    );
    server.use(
      http.get("https://backend.test/v1/pages/p_internal", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    await expect(
      apiFetchServer("/v1/pages/p_internal", { allowAnonymousFallback: true }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_SESSION" });
  });

  it("allowAnonymousFallback 미지정이면 401 을 그대로 던진다 (기존 흐름)", async () => {
    getCookieMock.mockImplementation((name: string) =>
      name === SESSION_COOKIE_NAME ? { value: "sess_xxx" } : undefined,
    );
    server.use(
      http.get("https://backend.test/v1/pages/p_internal", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    await expect(apiFetchServer("/v1/pages/p_internal")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_SESSION",
    });
  });

  it("BACKEND_URL 미설정 시 즉시 던진다", async () => {
    vi.stubEnv("BACKEND_URL", "");

    await expect(apiFetchServer("/v1/pages/p_1")).rejects.toThrow(/BACKEND_URL/);
  });
});
