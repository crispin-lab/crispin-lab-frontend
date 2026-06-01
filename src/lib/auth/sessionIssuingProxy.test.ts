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

import { proxyAndIssueSession } from "./sessionIssuingProxy";

const BACKEND_URL = "https://backend.test";
const VALID_TOKEN = "sess_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
const UPSTREAM_PATH = "/v1/test/sessions";
const LOG_TAG = "test/proxy";

async function call(body: unknown, options?: { raw?: string }): Promise<Response> {
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
  };
  if (options?.raw !== undefined) {
    init.body = options.raw;
  } else {
    init.body = JSON.stringify(body);
  }
  return proxyAndIssueSession(new Request("http://localhost/api/test", init), {
    upstreamPath: UPSTREAM_PATH,
    logTag: LOG_TAG,
  });
}

describe("proxyAndIssueSession", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", BACKEND_URL);
    cookieSet.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("성공 시 session cookie 발급 + { ok: true } 반환", async () => {
    server.use(
      http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () =>
        HttpResponse.json({ userId: "42", token: VALID_TOKEN }),
      ),
    );

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
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
      http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () =>
        HttpResponse.json({ userId: "42", token: VALID_TOKEN }),
      ),
    );

    await call({ email: "a@b.com", password: "pw" });

    expect(cookieSet).toHaveBeenCalledWith(expect.objectContaining({ secure: false }));
  });

  it("production 에서는 secure=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    server.use(
      http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () =>
        HttpResponse.json({ userId: "42", token: VALID_TOKEN }),
      ),
    );

    await call({ email: "a@b.com", password: "pw" });

    expect(cookieSet).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it("백엔드 4xx 는 status + body 그대로 패스스루, cookie 미발급", async () => {
    server.use(
      http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () =>
        HttpResponse.json(
          { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 },
        ),
      ),
    );

    const response = await call({ email: "a@b.com", password: "wrong" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_CREDENTIALS",
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("백엔드 5xx text/plain 본문도 content-type 보존 패스스루", async () => {
    server.use(
      http.post(
        `${BACKEND_URL}${UPSTREAM_PATH}`,
        () =>
          new HttpResponse("upstream down", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          }),
      ),
    );

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    await expect(response.text()).resolves.toBe("upstream down");
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("백엔드 success 인데 token 없으면 502 + console.error 진단 로그 (logTag 포함)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(
      http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () => HttpResponse.json({ userId: "42" })),
    );

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_UNEXPECTED_RESPONSE" });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(LOG_TAG), expect.any(Object));
    errorSpy.mockRestore();
  });

  it("token 형식 (sess_xxx) 어긋나면 502", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(
      http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () =>
        HttpResponse.json({ userId: "42", token: "not-a-valid-token" }),
      ),
    );

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(502);
    expect(cookieSet).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("빈 body 면 400 BFF_EMPTY_BODY (upstream 호출 안 함)", async () => {
    const response = await call(undefined, { raw: "" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_EMPTY_BODY" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("upstream fetch throw 시 502 BFF_UPSTREAM_UNAVAILABLE (logTag 포함)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(http.post(`${BACKEND_URL}${UPSTREAM_PATH}`, () => HttpResponse.error()));

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_UPSTREAM_UNAVAILABLE" });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(LOG_TAG), expect.any(Object));
    errorSpy.mockRestore();
  });

  it("upstream 이 3xx redirect 응답 시 502 BFF_UPSTREAM_REDIRECT (인증 누설 차단)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(
      http.post(
        `${BACKEND_URL}${UPSTREAM_PATH}`,
        () => new HttpResponse(null, { status: 302, headers: { location: "https://evil.com/" } }),
      ),
    );

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_UPSTREAM_REDIRECT" });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(LOG_TAG), expect.any(Object));
    errorSpy.mockRestore();
  });

  it("BACKEND_URL 미설정 시 500 BFF_MISCONFIGURED", async () => {
    vi.stubEnv("BACKEND_URL", "");

    const response = await call({ email: "a@b.com", password: "pw" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_MISCONFIGURED" });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
