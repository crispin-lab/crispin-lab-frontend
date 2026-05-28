import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

const cookieGet = vi.fn<(name: string) => { value: string } | undefined>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

const BACKEND_URL = "https://backend.test";

async function callProxy(request: Request, pathSegments: string[]): Promise<Response> {
  const { GET, POST, PUT, PATCH, DELETE } = await import("./route");
  // Next.js 는 GET 만 export 해도 HEAD 를 자동 라우팅한다 — 같은 핸들러로 dispatch.
  const dispatchMethod = request.method === "HEAD" ? "GET" : request.method;
  const handler = { GET, POST, PUT, PATCH, DELETE }[
    dispatchMethod as "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  ];
  if (!handler) throw new Error(`unsupported method: ${request.method}`);
  return handler(request, { params: Promise.resolve({ path: pathSegments }) });
}

describe("BFF catch-all proxy", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = BACKEND_URL;
    cookieGet.mockReset();
  });

  afterEach(() => {
    delete process.env.BACKEND_URL;
  });

  it("BACKEND_URL 이 비어 있으면 500 + BFF_MISCONFIGURED 로 떨어진다", async () => {
    delete process.env.BACKEND_URL;
    const request = new Request("http://localhost/api/v1/pages", { method: "GET" });

    const response = await callProxy(request, ["v1", "pages"]);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({ code: "BFF_MISCONFIGURED" });
  });

  it("session cookie 가 있으면 Authorization: Bearer 로 변환해 upstream 호출", async () => {
    cookieGet.mockReturnValue({ value: "sess_abc" });
    let receivedAuth: string | null = null;
    server.use(
      http.get(`${BACKEND_URL}/v1/pages/p_1`, ({ request }) => {
        receivedAuth = request.headers.get("authorization");
        return HttpResponse.json({ pageId: "p_1" });
      }),
    );

    const request = new Request("http://localhost/api/v1/pages/p_1", { method: "GET" });
    const response = await callProxy(request, ["v1", "pages", "p_1"]);

    expect(response.status).toBe(200);
    expect(receivedAuth).toBe("Bearer sess_abc");
    await expect(response.json()).resolves.toEqual({ pageId: "p_1" });
  });

  it("session cookie 가 없으면 Authorization 헤더 없이 anonymous 호출", async () => {
    cookieGet.mockReturnValue(undefined);
    let receivedAuth: string | null = "INITIAL";
    server.use(
      http.get(`${BACKEND_URL}/v1/pages/public`, ({ request }) => {
        receivedAuth = request.headers.get("authorization");
        return HttpResponse.json({ pageId: "public", visibility: "PUBLIC" });
      }),
    );

    const request = new Request("http://localhost/api/v1/pages/public", {
      method: "GET",
      headers: { authorization: "Bearer leaked-from-elsewhere" },
    });
    const response = await callProxy(request, ["v1", "pages", "public"]);

    expect(response.status).toBe(200);
    // cookie 가 없으면 클라이언트가 보낸 Authorization 도 strip
    expect(receivedAuth).toBeNull();
  });

  it("cookie 헤더는 upstream 에 전달되지 않는다", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    let receivedCookie: string | null = "INITIAL";
    server.use(
      http.get(`${BACKEND_URL}/v1/pages/p_2`, ({ request }) => {
        receivedCookie = request.headers.get("cookie");
        return HttpResponse.json({});
      }),
    );

    const request = new Request("http://localhost/api/v1/pages/p_2", {
      method: "GET",
      headers: { cookie: "session=sess_xxx; theme=dark" },
    });
    await callProxy(request, ["v1", "pages", "p_2"]);

    expect(receivedCookie).toBeNull();
  });

  it("쿼리스트링을 upstream URL 에 그대로 전달", async () => {
    cookieGet.mockReturnValue(undefined);
    let receivedUrl: string | undefined;
    server.use(
      http.get(`${BACKEND_URL}/v1/pages`, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );

    const request = new Request("http://localhost/api/v1/pages?page=2&sort=recent", {
      method: "GET",
    });
    await callProxy(request, ["v1", "pages"]);

    expect(receivedUrl).toBe(`${BACKEND_URL}/v1/pages?page=2&sort=recent`);
  });

  it("POST body 는 upstream 으로 그대로 전달", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    let receivedBody: unknown;
    server.use(
      http.post(`${BACKEND_URL}/v1/pages`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    const request = new Request("http://localhost/api/v1/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "새 페이지" }),
    });
    const response = await callProxy(request, ["v1", "pages"]);

    expect(response.status).toBe(201);
    expect(receivedBody).toEqual({ title: "새 페이지" });
  });

  it("upstream 4xx 응답을 status + body 그대로 패스스루", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    server.use(
      http.get(`${BACKEND_URL}/v1/pages/p_missing`, () =>
        HttpResponse.json(
          { code: "PAGE_NOT_FOUND", message: "페이지를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    const request = new Request("http://localhost/api/v1/pages/p_missing", { method: "GET" });
    const response = await callProxy(request, ["v1", "pages", "p_missing"]);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "PAGE_NOT_FOUND",
      message: "페이지를 찾을 수 없습니다.",
    });
  });

  it("응답에서 hop-by-hop 및 encoding 헤더를 strip", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    server.use(
      http.get(`${BACKEND_URL}/v1/pages/p_3`, () =>
        HttpResponse.json(
          { ok: true },
          {
            status: 200,
            headers: {
              "content-encoding": "gzip",
              "transfer-encoding": "chunked",
              connection: "keep-alive",
              "set-cookie": "leaked=1",
              "x-custom": "passthrough",
            },
          },
        ),
      ),
    );

    const request = new Request("http://localhost/api/v1/pages/p_3", { method: "GET" });
    const response = await callProxy(request, ["v1", "pages", "p_3"]);

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(response.headers.get("connection")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-custom")).toBe("passthrough");
  });

  it("BACKEND_URL 의 trailing slash 가 있어도 double slash 가 생기지 않는다", async () => {
    process.env.BACKEND_URL = `${BACKEND_URL}/`;
    cookieGet.mockReturnValue(undefined);
    let receivedUrl: string | undefined;
    server.use(
      http.get(`${BACKEND_URL}/v1/ping`, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({ pong: true });
      }),
    );

    const request = new Request("http://localhost/api/v1/ping", { method: "GET" });
    await callProxy(request, ["v1", "ping"]);

    expect(receivedUrl).toBe(`${BACKEND_URL}/v1/ping`);
  });

  it("204 No Content 응답은 body 없이 status 만 전달 (Response constructor 가 throw 하지 않음)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    server.use(
      http.delete(`${BACKEND_URL}/v1/pages/p_4`, () => new HttpResponse(null, { status: 204 })),
    );

    const request = new Request("http://localhost/api/v1/pages/p_4", { method: "DELETE" });
    const response = await callProxy(request, ["v1", "pages", "p_4"]);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("HEAD 응답은 body 없이 status / headers 만 전달", async () => {
    cookieGet.mockReturnValue(undefined);
    server.use(
      http.head(
        `${BACKEND_URL}/v1/pages/p_5`,
        () => new HttpResponse(null, { status: 200, headers: { "x-page-id": "p_5" } }),
      ),
    );

    const request = new Request("http://localhost/api/v1/pages/p_5", { method: "HEAD" });
    const response = await callProxy(request, ["v1", "pages", "p_5"]);

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get("x-page-id")).toBe("p_5");
  });

  it("upstream 3xx 응답은 502 BFF_UPSTREAM_REDIRECT 로 강등 (Location 외부 호스트 누수 차단)", async () => {
    cookieGet.mockReturnValue(undefined);
    server.use(
      http.get(
        `${BACKEND_URL}/v1/pages/p_redir`,
        () =>
          new HttpResponse(null, {
            status: 302,
            headers: { location: "https://evil.example/leak" },
          }),
      ),
    );

    const request = new Request("http://localhost/api/v1/pages/p_redir", { method: "GET" });
    const response = await callProxy(request, ["v1", "pages", "p_redir"]);

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_UPSTREAM_REDIRECT" });
  });

  it("request 측 hop-by-hop + x-forwarded-* 헤더는 upstream 으로 전달되지 않는다", async () => {
    cookieGet.mockReturnValue(undefined);
    let received: Headers | undefined;
    server.use(
      http.get(`${BACKEND_URL}/v1/pages`, ({ request }) => {
        received = request.headers;
        return HttpResponse.json([]);
      }),
    );

    const request = new Request("http://localhost/api/v1/pages", {
      method: "GET",
      headers: {
        connection: "keep-alive",
        "transfer-encoding": "chunked",
        "x-forwarded-for": "1.2.3.4",
        "x-forwarded-host": "evil.example",
        "x-real-ip": "5.6.7.8",
        forwarded: "for=1.2.3.4",
        "x-custom": "passthrough",
      },
    });
    await callProxy(request, ["v1", "pages"]);

    expect(received?.get("connection")).toBeNull();
    expect(received?.get("transfer-encoding")).toBeNull();
    expect(received?.get("x-forwarded-for")).toBeNull();
    expect(received?.get("x-forwarded-host")).toBeNull();
    expect(received?.get("x-real-ip")).toBeNull();
    expect(received?.get("forwarded")).toBeNull();
    expect(received?.get("x-custom")).toBe("passthrough");
  });

  it("path traversal segment (.., .) 는 400 BFF_INVALID_PATH 로 거절", async () => {
    cookieGet.mockReturnValue(undefined);

    const request = new Request("http://localhost/api/v1/pages/..", { method: "GET" });
    const response = await callProxy(request, ["v1", "pages", ".."]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "BFF_INVALID_PATH" });
  });

  it("path segment 는 per-segment encode 되어 upstream URL 구성", async () => {
    cookieGet.mockReturnValue(undefined);
    let receivedUrl: string | undefined;
    server.use(
      http.get(`${BACKEND_URL}/v1/pages/${encodeURIComponent("p 1")}`, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({});
      }),
    );

    const request = new Request("http://localhost/api/v1/pages/p%201", { method: "GET" });
    await callProxy(request, ["v1", "pages", "p 1"]);

    expect(receivedUrl).toBe(`${BACKEND_URL}/v1/pages/${encodeURIComponent("p 1")}`);
  });

  it("POST body 가 비어 있어도 정상 (empty body 가드)", async () => {
    cookieGet.mockReturnValue({ value: "sess_xxx" });
    let receivedBody: string | undefined;
    server.use(
      http.post(`${BACKEND_URL}/v1/pages/p_6/publish`, async ({ request }) => {
        receivedBody = await request.text();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const request = new Request("http://localhost/api/v1/pages/p_6/publish", { method: "POST" });
    const response = await callProxy(request, ["v1", "pages", "p_6", "publish"]);

    expect(response.status).toBe(204);
    expect(receivedBody).toBe("");
  });
});
