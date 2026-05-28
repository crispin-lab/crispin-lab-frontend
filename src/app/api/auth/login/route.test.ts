import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

const cookieSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: cookieSet,
    delete: vi.fn(),
  })),
}));

const BACKEND_URL = "https://backend.test";
const VALID_TOKEN = "sess_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ"; // 43 char base64url

async function callLogin(body: unknown, options?: { raw?: string }): Promise<Response> {
  const { POST } = await import("./route");
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
  };
  if (options?.raw !== undefined) {
    init.body = options.raw;
  } else {
    init.body = JSON.stringify(body);
  }
  return POST(new Request("http://localhost/api/auth/login", init));
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", BACKEND_URL);
    cookieSet.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("성공 시 session cookie 를 발급하고 { ok: true } 를 반환한다", async () => {
    server.use(
      http.post(`${BACKEND_URL}/v1/sessions`, () =>
        HttpResponse.json({ sessionToken: VALID_TOKEN }),
      ),
    );

    const response = await callLogin({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(cookieSet).toHaveBeenCalledTimes(1);
    expect(cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "session",
        value: VALID_TOKEN,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("dev (NODE_ENV !== production) 에서는 secure=false", async () => {
    vi.stubEnv("NODE_ENV", "development");
    server.use(
      http.post(`${BACKEND_URL}/v1/sessions`, () =>
        HttpResponse.json({ sessionToken: VALID_TOKEN }),
      ),
    );

    await callLogin({ email: "a@b.com", password: "pw" });

    expect(cookieSet).toHaveBeenCalledWith(expect.objectContaining({ secure: false }));
  });

  it("production 에서는 secure=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    server.use(
      http.post(`${BACKEND_URL}/v1/sessions`, () =>
        HttpResponse.json({ sessionToken: VALID_TOKEN }),
      ),
    );

    await callLogin({ email: "a@b.com", password: "pw" });

    expect(cookieSet).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it("백엔드 4xx 응답은 status + body 그대로 패스스루, cookie 미발급", async () => {
    server.use(
      http.post(`${BACKEND_URL}/v1/sessions`, () =>
        HttpResponse.json(
          { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 },
        ),
      ),
    );

    const response = await callLogin({ email: "a@b.com", password: "wrong" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_CREDENTIALS",
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("백엔드 5xx 의 text/plain 본문도 content-type 보존하며 그대로 패스스루", async () => {
    server.use(
      http.post(
        `${BACKEND_URL}/v1/sessions`,
        () =>
          new HttpResponse("upstream down", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          }),
      ),
    );

    const response = await callLogin({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    await expect(response.text()).resolves.toBe("upstream down");
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("백엔드가 200 이지만 sessionToken 이 없으면 502 + console.error 진단 로그", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(http.post(`${BACKEND_URL}/v1/sessions`, () => HttpResponse.json({})));

    const response = await callLogin({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_UNEXPECTED_RESPONSE" });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("백엔드 200 이지만 sessionToken 형식 (sess_xxx) 이 어긋나면 502", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(
      http.post(`${BACKEND_URL}/v1/sessions`, () =>
        HttpResponse.json({ sessionToken: "not-a-valid-token" }),
      ),
    );

    const response = await callLogin({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(502);
    expect(cookieSet).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("빈 body 면 400 BFF_EMPTY_BODY 로 거절 (upstream 호출 안 함)", async () => {
    const response = await callLogin(undefined, { raw: "" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_EMPTY_BODY" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("BACKEND_URL 미설정 시 500 BFF_MISCONFIGURED", async () => {
    vi.stubEnv("BACKEND_URL", "");

    const response = await callLogin({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_MISCONFIGURED" });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
