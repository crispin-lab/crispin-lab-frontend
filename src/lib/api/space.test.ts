import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";

import { asSpaceId } from "./ids";
import { createSpace, fetchSpace, listSpaces } from "./space";

describe("fetchSpace", () => {
  it("GET /api/v1/spaces/{spaceId} 를 호출하고 응답을 그대로 반환한다", async () => {
    server.use(
      http.get("*/api/v1/spaces/s_1", () =>
        HttpResponse.json({
          createdAt: "2026-01-01T00:00:00Z",
          spaceId: "s_1",
          visibility: "PUBLIC",
          name: "내 스페이스",
          description: "설명",
          updatedAt: "2026-01-02T00:00:00Z",
        }),
      ),
    );

    const result = await fetchSpace(asSpaceId("s_1"));

    expect(result.spaceId).toBe("s_1");
    expect(result.name).toBe("내 스페이스");
  });

  it("404 응답을 ApiError 로 lift 한다", async () => {
    server.use(
      http.get("*/api/v1/spaces/s_missing", () =>
        HttpResponse.json(
          { code: "SPACE_NOT_FOUND", message: "스페이스를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    await expect(fetchSpace(asSpaceId("s_missing"))).rejects.toMatchObject({
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  });
});

describe("listSpaces", () => {
  it("page / size 를 URL query 로 직렬화한다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/spaces", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          size: 20,
          isEmpty: false,
          totalPages: 1,
          hasNext: false,
          page: 0,
          items: [],
          totalElements: 0,
        });
      }),
    );

    await listSpaces({ page: 0, size: 20 });

    expect(capturedUrl?.searchParams.get("page")).toBe("0");
    expect(capturedUrl?.searchParams.get("size")).toBe("20");
  });

  it("빈 인자로 부르면 query string 이 없는 경로를 호출한다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/spaces", ({ request }) => {
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

    await listSpaces();

    expect(capturedUrl?.search).toBe("");
  });

  it("empty 응답을 그대로 패스스루한다", async () => {
    server.use(
      http.get("*/api/v1/spaces", () =>
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

    const result = await listSpaces({ page: 0, size: 20 });

    expect(result.isEmpty).toBe(true);
    expect(result.items).toEqual([]);
  });
});

describe("createSpace", () => {
  it("POST /api/v1/spaces 로 body 를 전송하고 생성된 spaceId 를 반환한다", async () => {
    let receivedBody: unknown;
    server.use(
      http.post("*/api/v1/spaces", async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ spaceId: "s_new" }, { status: 201 });
      }),
    );

    const result = await createSpace({
      name: "새 스페이스",
      description: "설명",
      visibility: "INTERNAL",
    });

    expect(receivedBody).toEqual({
      name: "새 스페이스",
      description: "설명",
      visibility: "INTERNAL",
    });
    expect(result.spaceId).toBe("s_new");
  });
});
