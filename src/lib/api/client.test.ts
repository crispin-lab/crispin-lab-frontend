import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";

import { ApiError, apiFetch } from "./client";

describe("apiFetch", () => {
  it("'/api/' 로 시작하지 않으면 즉시 던진다", async () => {
    await expect(apiFetch("/v1/pages")).rejects.toThrow(/must start with '\/api\/'/);
  });

  it("200 응답을 파싱해 반환한다", async () => {
    server.use(
      http.get("*/api/pages/p_1", () => HttpResponse.json({ pageId: "p_1", title: "안녕" })),
    );

    const result = await apiFetch<{ pageId: string; title: string }>("/api/pages/p_1");

    expect(result).toEqual({ pageId: "p_1", title: "안녕" });
  });

  it("204 No Content 에서는 undefined 를 반환한다", async () => {
    server.use(http.post("*/api/sessions/logout", () => new HttpResponse(null, { status: 204 })));

    const result = await apiFetch<void>("/api/sessions/logout", { method: "POST" });

    expect(result).toBeUndefined();
  });

  it("200 + 빈 body 도 SyntaxError 없이 undefined 를 반환한다", async () => {
    server.use(http.post("*/api/pages/p_1/publish", () => new HttpResponse("", { status: 200 })));

    const result = await apiFetch<void>("/api/pages/p_1/publish", { method: "POST" });

    expect(result).toBeUndefined();
  });

  it("POST body 를 JSON 으로 직렬화한다", async () => {
    let received: unknown;
    server.use(
      http.post("*/api/pages", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    await apiFetch("/api/pages", { method: "POST", body: { title: "새 페이지" } });

    expect(received).toEqual({ title: "새 페이지" });
  });

  it("백엔드 에러 응답의 code/message 를 ApiError 로 lift 한다", async () => {
    server.use(
      http.get("*/api/pages/p_missing", () =>
        HttpResponse.json(
          { code: "PAGE_NOT_FOUND", message: "페이지를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    await expect(apiFetch("/api/pages/p_missing")).rejects.toMatchObject({
      status: 404,
      code: "PAGE_NOT_FOUND",
      message: "페이지를 찾을 수 없습니다.",
    });
  });

  it("에러 응답 body 가 비어 있어도 fallback message 로 ApiError 를 만든다", async () => {
    server.use(http.get("*/api/pages/p_broken", () => new HttpResponse(null, { status: 500 })));

    await expect(apiFetch("/api/pages/p_broken")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
      message: "요청을 처리하지 못했습니다.",
    });
  });

  it("AbortSignal 로 호출을 취소할 수 있다", async () => {
    server.use(
      http.get("*/api/pages/p_slow", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ pageId: "p_slow" });
      }),
    );

    const controller = new AbortController();
    const pending = apiFetch("/api/pages/p_slow", { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(controller.signal.aborted).toBe(true);
  });
});

describe("ApiError.fromResponse", () => {
  it("JSON 파싱 실패 시 fallback 으로 떨어진다", async () => {
    const broken = new Response("not-json", { status: 502 });
    const error = await ApiError.fromResponse(broken);
    expect(error.status).toBe(502);
    expect(error.code).toBe("UNKNOWN");
    expect(error.message).toBe("요청을 처리하지 못했습니다.");
  });
});
