import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";

import { asSpaceId, asUserId } from "./ids";
import { searchMentionCandidates } from "./mention";
import type { MentionContext } from "@/lib/mention/context";

function context(overrides: Partial<MentionContext> = {}): MentionContext {
  return {
    spaceId: asSpaceId("s_1"),
    spaceVisibility: "PUBLIC",
    pageVisibility: "PUBLIC",
    pageAuthorId: asUserId("u_author"),
    ...overrides,
  };
}

describe("searchMentionCandidates", () => {
  it("GET /api/v1/mention-candidates 를 편집 컨텍스트 query 와 함께 호출한다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/mention-candidates", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          items: [
            { userId: "u_1", handle: "alice" },
            { userId: "u_2", handle: "alice_kim" },
          ],
        });
      }),
    );

    const result = await searchMentionCandidates({
      query: "al",
      size: 8,
      context: context({ pageVisibility: "INTERNAL" }),
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ userId: "u_1", handle: "alice" });
    expect(capturedUrl?.searchParams.get("query")).toBe("al");
    expect(capturedUrl?.searchParams.get("size")).toBe("8");
    expect(capturedUrl?.searchParams.get("spaceId")).toBe("s_1");
    expect(capturedUrl?.searchParams.get("spaceVisibility")).toBe("PUBLIC");
    expect(capturedUrl?.searchParams.get("pageVisibility")).toBe("INTERNAL");
    expect(capturedUrl?.searchParams.get("pageAuthorId")).toBe("u_author");
  });

  it("size 를 생략하면 size query 도 생략된다", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/mention-candidates", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({ items: [] });
      }),
    );

    await searchMentionCandidates({ query: "al", context: context() });

    expect(capturedUrl?.searchParams.has("size")).toBe(false);
  });

  it("응답의 userId 를 브랜드 타입으로 lift 한다", async () => {
    server.use(
      http.get("*/api/v1/mention-candidates", () =>
        HttpResponse.json({ items: [{ userId: "u_lift", handle: "alice" }] }),
      ),
    );

    const result = await searchMentionCandidates({ query: "al", context: context() });
    // asUserId 가 lift 한 값이라 UserId branded 타입으로 다른 UserId 와 비교 가능.
    expect(result.items[0].userId).toBe(asUserId("u_lift"));
  });
});
