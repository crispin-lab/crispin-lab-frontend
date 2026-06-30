import { expect, test } from "@playwright/test";

import { configureMock, resetMocks } from "./fixtures/api";

const pageId = "p_comment_test";
const spaceId = "s_comment";

const emptyDocContent = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

function buildPage({ canComment }: { canComment: boolean }) {
  return {
    pageId,
    spaceId,
    title: "댓글 테스트 페이지",
    visibility: "PUBLIC",
    content: emptyDocContent,
    canEdit: false,
    canComment,
    currentVersion: 1,
    displayOrder: 0,
    authorId: "u_author",
    authorHandle: "author",
    ancestors: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const baseSpace = {
  spaceId,
  name: "댓글 스페이스",
  visibility: "PUBLIC",
  description: "",
  canWrite: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

test.describe("댓글 thread — canComment 게이트 (LAB-94)", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("canComment=false 이면 등록 form 대신 로그인 안내 문구만 노출된다", async ({
    page,
    request,
  }) => {
    await configureMock(request, "GET", "/v1/users/me", {
      status: 401,
      body: { code: "INVALID_SESSION", message: "" },
    });
    await configureMock(request, "GET", `/v1/pages/${pageId}`, {
      body: buildPage({ canComment: false }),
    });
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, { body: baseSpace });

    await page.goto(`/pages/${pageId}`);

    await expect(page.getByText("댓글을 남기려면 로그인해 주세요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "등록" })).toHaveCount(0);
  });

  test("canComment=true 이면 등록 form (editor + 등록 버튼) 이 노출된다", async ({
    page,
    request,
  }) => {
    await configureMock(request, "GET", "/v1/users/me", {
      body: { userId: "u_viewer", handle: "viewer", email: "viewer@test", role: "USER" },
    });
    await configureMock(request, "GET", `/v1/pages/${pageId}`, {
      body: buildPage({ canComment: true }),
    });
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, { body: baseSpace });

    await page.goto(`/pages/${pageId}`);

    // 등록 버튼이 compose form 의 유일한 unambiguous landmark — TipTap placeholder 는 CSS ::before 라
    // getByText 미발견.
    await expect(page.getByRole("button", { name: "등록" })).toBeVisible();
  });
});
