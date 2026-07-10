import { expect, test } from "@playwright/test";

import { configureMock, resetMocks } from "./fixtures/api";

const spaceId = "s_edit";

const owner = {
  userId: "u_owner",
  handle: "owner",
  email: "owner@test",
  role: "USER",
};

function buildSpace({
  name,
  canEdit,
  updatedAt = "2026-01-01T00:00:00Z",
}: {
  name: string;
  canEdit: boolean;
  updatedAt?: string;
}) {
  return {
    spaceId,
    name,
    visibility: "PUBLIC",
    description: "편집 e2e 스페이스",
    canWrite: true,
    canEdit,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt,
  };
}

test.describe("스페이스 편집 흐름", () => {
  test.beforeEach(async ({ request }) => {
    await resetMocks(request);
  });

  test("OWNER 로 편집 진입 → 이름 저장 → toast '스페이스로 이동' → 상세에 새 이름 반영", async ({
    page,
    request,
  }) => {
    await configureMock(request, "GET", "/v1/users/me", { body: owner });
    // 편집 진입은 canEdit: true 스페이스로 시작. 저장 성공 후 상세 재조회는 새 이름을 그대로 반환하도록
    // 마지막에 한 번 더 configure — 같은 키 덮어쓰기 (server.mjs 가 경고만 남기고 허용).
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, {
      body: buildSpace({ name: "원래 이름", canEdit: true }),
    });
    await configureMock(request, "PUT", `/v1/spaces/${spaceId}`, {
      body: {
        spaceId,
        name: "새 이름",
        description: "편집 e2e 스페이스",
        visibility: "PUBLIC",
        updatedAt: "2026-07-10T00:00:00Z",
      },
    });

    await page.goto(`/spaces/${spaceId}/edit`);

    const nameInput = page.getByPlaceholder("예: 디자인 시스템");
    await expect(nameInput).toHaveValue("원래 이름");

    await nameInput.fill("새 이름");
    await page.getByRole("button", { name: "저장" }).click();

    // 저장 이후엔 detail 재조회가 새 이름을 반환해 breadcrumb / heading 이 갱신되도록 덮어쓰기.
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, {
      body: buildSpace({
        name: "새 이름",
        canEdit: true,
        updatedAt: "2026-07-10T00:00:00Z",
      }),
    });

    await expect(page.getByText("저장했어요")).toBeVisible();
    await page.getByRole("button", { name: "스페이스로 이동" }).click();

    await expect(page.getByRole("heading", { name: "새 이름" })).toBeVisible();
  });

  test("canEdit: false 스페이스로 /edit 직접 진입하면 notFound 로 흡수된다", async ({
    page,
    request,
  }) => {
    await configureMock(request, "GET", "/v1/users/me", { body: owner });
    await configureMock(request, "GET", `/v1/spaces/${spaceId}`, {
      body: buildSpace({ name: "권한 없음", canEdit: false }),
    });

    await page.goto(`/spaces/${spaceId}/edit`);

    await expect(
      page.getByRole("heading", { name: "이 페이지를 찾을 수 없습니다." }),
    ).toBeVisible();
  });
});
