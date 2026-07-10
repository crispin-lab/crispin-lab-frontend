import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";

import { asPageId, asSpaceId } from "./ids";
import { createPage, fetchInboundLinks, fetchPage, searchPages, editPage } from "./page";

describe("fetchPage", () => {
  it("GET /api/v1/pages/{pageId} 를 호출하고 응답을 그대로 반환한다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json({
          createdAt: "2026-01-01T00:00:00Z",
          spaceId: "s_1",
          visibility: "PUBLIC",
          parentPageId: null,
          title: "안녕",
          authorHandle: "crispin",
          authorId: "u_1",
          pageId: "p_1",
          currentVersion: 1,
          content: "본문",
          updatedAt: "2026-01-02T00:00:00Z",
        }),
      ),
    );

    const result = await fetchPage(asPageId("p_1"));

    expect(result.pageId).toBe("p_1");
    expect(result.title).toBe("안녕");
  });

  it("404 응답을 ApiError 로 lift 한다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_missing", () =>
        HttpResponse.json(
          { code: "PAGE_NOT_FOUND", message: "페이지를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    await expect(fetchPage(asPageId("p_missing"))).rejects.toMatchObject({
      status: 404,
      code: "PAGE_NOT_FOUND",
    });
  });
});

describe("searchPages", () => {
  it("모든 인자를 URL query 로 직렬화한다 (tag 다중 시 반복 append)", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/pages", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          size: 10,
          isEmpty: false,
          totalPages: 1,
          hasNext: false,
          page: 2,
          items: [],
          totalElements: 0,
        });
      }),
    );

    await searchPages({
      query: "키워드",
      spaceId: asSpaceId("s_1"),
      tag: ["t_a", "t_b"],
      sort: "UPDATED_AT",
      page: 2,
      size: 10,
    });

    expect(capturedUrl?.searchParams.get("query")).toBe("키워드");
    expect(capturedUrl?.searchParams.get("space")).toBe("s_1");
    expect(capturedUrl?.searchParams.getAll("tag")).toEqual(["t_a", "t_b"]);
    expect(capturedUrl?.searchParams.get("sort")).toBe("UPDATED_AT");
    expect(capturedUrl?.searchParams.get("page")).toBe("2");
    expect(capturedUrl?.searchParams.get("size")).toBe("10");
  });

  it("빈 인자로 부르면 query string 이 없는 경로를 호출한다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/pages", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          size: 0,
          isEmpty: true,
          totalPages: 0,
          hasNext: false,
          page: 0,
          items: [],
          totalElements: 0,
        });
      }),
    );

    await searchPages({});

    expect(capturedUrl?.search).toBe("");
  });

  it("empty 응답을 그대로 패스스루한다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json({
          size: 20,
          isEmpty: true,
          totalPages: 0,
          hasNext: false,
          page: 0,
          items: [],
          totalElements: 0,
        }),
      ),
    );

    const result = await searchPages({ spaceId: asSpaceId("s_empty") });

    expect(result.isEmpty).toBe(true);
    expect(result.items).toEqual([]);
  });
});

describe("editPage", () => {
  it("PUT /api/v1/pages/{pageId} 로 body 를 전송하고 응답을 반환한다", async () => {
    let receivedBody: unknown;
    server.use(
      http.put("*/api/v1/pages/p_1", async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          title: "수정됨",
          pageId: "p_1",
          version: 2,
          updatedAt: "2026-02-01T00:00:00Z",
        });
      }),
    );

    const result = await editPage(asPageId("p_1"), {
      title: "수정됨",
      content: "새 본문",
    });

    expect(receivedBody).toEqual({ title: "수정됨", content: "새 본문" });
    expect(result.version).toBe(2);
  });
});

describe("fetchInboundLinks", () => {
  const emptyBody = {
    size: 20,
    isEmpty: true,
    totalPages: 0,
    hasNext: false,
    page: 0,
    items: [],
    totalElements: 0,
  };

  it("page/size 미지정 시 query string 없이 호출한다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(emptyBody);
      }),
    );

    await fetchInboundLinks(asPageId("p_1"));

    expect(capturedUrl?.search).toBe("");
  });

  it("page/size 를 URL query 로 직렬화한다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(emptyBody);
      }),
    );

    await fetchInboundLinks(asPageId("p_1"), { page: 0, size: 20 });

    expect(capturedUrl?.searchParams.get("page")).toBe("0");
    expect(capturedUrl?.searchParams.get("size")).toBe("20");
  });

  it("응답을 그대로 패스스루한다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", () =>
        HttpResponse.json({
          ...emptyBody,
          isEmpty: false,
          totalPages: 1,
          totalElements: 1,
          items: [
            {
              pageId: "p_src",
              spaceId: "s_1",
              parentPageId: null,
              authorId: "u_1",
              authorHandle: "alice",
              title: "이전 회고",
              visibility: "PUBLIC",
              displayOrder: 0,
              updatedAt: "2025-01-01T00:00:00Z",
            },
          ],
        }),
      ),
    );

    const result = await fetchInboundLinks(asPageId("p_1"), { size: 20 });

    expect(result.items.length).toBe(1);
    expect(result.items[0].pageId).toBe("p_src");
    expect(result.items[0].title).toBe("이전 회고");
  });

  it("404 응답을 ApiError 로 lift 한다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_missing/inbound", () =>
        HttpResponse.json(
          { code: "PAGE_NOT_FOUND", message: "페이지를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    await expect(fetchInboundLinks(asPageId("p_missing"))).rejects.toMatchObject({
      status: 404,
      code: "PAGE_NOT_FOUND",
    });
  });
});

describe("createPage", () => {
  it("POST /api/v1/pages 로 body 를 전송하고 생성된 pageId 를 반환한다", async () => {
    let receivedBody: unknown;
    server.use(
      http.post("*/api/v1/pages", async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    const result = await createPage({
      spaceId: "s_1",
      visibility: "PUBLIC",
      title: "새 글",
      content: "본문",
    });

    expect(receivedBody).toMatchObject({ title: "새 글", spaceId: "s_1" });
    expect(result.pageId).toBe("p_new");
  });
});
