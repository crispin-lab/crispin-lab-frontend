import { expect, test } from "@playwright/test";

import { configureMock, resetMocks } from "./fixtures/api";

test.describe("PageLink displayText 마스킹 (LAB-115/120)", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("PUBLIC source 안 DRAFT/INTERNAL target 의 마스킹 chip 이 본문에 노출된다", async ({
    page,
    request,
  }) => {
    const pageId = "p_public_src";
    const spaceId = "s_1";

    // BE 가 viewer scope 와 안 맞는 target 의 displayText 를 '비공개 페이지' 로 치환한 상태 (pageId 는 보존).
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "이 문장은 " },
            {
              type: "pageLink",
              attrs: { pageId: "p_draft_target", displayText: "비공개 페이지" },
            },
            { type: "text", text: " 를 가리킨다." },
          ],
        },
      ],
    });

    await configureMock(request, "GET", "/v1/users/me", {
      status: 401,
      body: { code: "INVALID_SESSION", message: "" },
    });
    await configureMock(request, "GET", `/v1/pages/${pageId}`, {
      body: {
        pageId,
        spaceId,
        title: "공개 페이지",
        visibility: "PUBLIC",
        content,
        canEdit: false,
        canComment: false,
        currentVersion: 1,
        displayOrder: 0,
        authorId: "u_1",
        authorHandle: "crispin",
        ancestors: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, {
      body: {
        spaceId,
        name: "테스트 스페이스",
        visibility: "PUBLIC",
        description: "",
        canWrite: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });

    await page.goto(`/pages/${pageId}`);

    const chip = page.getByRole("link", { name: "비공개 페이지" });
    await expect(chip).toBeVisible();
  });
});
