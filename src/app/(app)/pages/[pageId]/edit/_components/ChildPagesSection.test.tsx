import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { ChildPagesSection } from "./ChildPagesSection";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const SPACE = asSpaceId("s_1");
const SELF = asPageId("p_self");

function pageSummary(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: "p_self",
    displayOrder: 0,
    authorHandle: "crispin",
    title: "자녀",
    authorId: "u_1",
    pageId: "p_child",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function pageSearchBody(
  items: PageSummary[],
  overrides: Partial<PageSearchResult> = {},
): PageSearchResult {
  return {
    size: 100,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
    ...overrides,
  };
}

describe("ChildPagesSection", () => {
  it("자녀가 없으면 empty state 를 노출한다", async () => {
    server.use(http.get("*/api/v1/pages", () => HttpResponse.json(pageSearchBody([]))));

    const { Wrapper } = createQueryWrapper();
    render(<ChildPagesSection pageId={SELF} spaceId={SPACE} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 자녀 페이지가 없습니다.")).toBeInTheDocument();
  });

  it("자녀 목록을 title + updatedAt 로 렌더하고 각 행에 액션 dropdown 이 있다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageSearchBody([
            pageSummary({ pageId: "p_a", title: "알파", displayOrder: 0 }),
            pageSummary({ pageId: "p_b", title: "베타", displayOrder: 1 }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<ChildPagesSection pageId={SELF} spaceId={SPACE} />, { wrapper: Wrapper });

    expect(await screen.findByText("알파")).toBeInTheDocument();
    expect(screen.getByText("베타")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /알파 액션 열기/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /베타 액션 열기/ })).toBeInTheDocument();
  });

  it("자녀 하나의 '이 페이지에서 분리' 클릭 시 parentPageId=null 로 move 요청", async () => {
    let sentParentPageId: string | null | undefined;
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(pageSearchBody([pageSummary({ pageId: "p_a", title: "알파" })])),
      ),
      http.put("*/api/v1/pages/p_a/parent", async ({ request }) => {
        const body = (await request.json()) as { parentPageId: string | null };
        sentParentPageId = body.parentPageId;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<ChildPagesSection pageId={SELF} spaceId={SPACE} />, { wrapper: Wrapper });

    await user.click(await screen.findByRole("button", { name: /알파 액션 열기/ }));
    await user.click(await screen.findByRole("menuitem", { name: /이 페이지에서 분리/ }));

    await waitFor(() => expect(sentParentPageId).toBeNull());
  });

  it("자녀의 '뒤로 이동' 클릭 시 다음 index 로 reorder 요청", async () => {
    let sentDisplayOrder: number | undefined;
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageSearchBody([
            pageSummary({ pageId: "p_a", title: "알파", displayOrder: 0 }),
            pageSummary({ pageId: "p_b", title: "베타", displayOrder: 1 }),
            pageSummary({ pageId: "p_c", title: "감마", displayOrder: 2 }),
          ]),
        ),
      ),
      http.put("*/api/v1/pages/p_a/order", async ({ request }) => {
        const body = (await request.json()) as { displayOrder: number };
        sentDisplayOrder = body.displayOrder;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<ChildPagesSection pageId={SELF} spaceId={SPACE} />, { wrapper: Wrapper });

    await user.click(await screen.findByRole("button", { name: /알파 액션 열기/ }));
    await user.click(await screen.findByRole("menuitem", { name: /뒤로 이동/ }));

    await waitFor(() => expect(sentDisplayOrder).toBe(1));
  });

  it("첫 자녀의 '앞으로 이동' 은 disabled 다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageSearchBody([
            pageSummary({ pageId: "p_a", title: "알파", displayOrder: 0 }),
            pageSummary({ pageId: "p_b", title: "베타", displayOrder: 1 }),
          ]),
        ),
      ),
    );

    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<ChildPagesSection pageId={SELF} spaceId={SPACE} />, { wrapper: Wrapper });

    await user.click(await screen.findByRole("button", { name: /알파 액션 열기/ }));
    expect(await screen.findByRole("menuitem", { name: /앞으로 이동/ })).toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByRole("menuitem", { name: /맨 앞으로/ })).toHaveAttribute("data-disabled");
  });

  it("hasNext 가 true 면 상한 안내를 노출한다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageSearchBody([pageSummary({ pageId: "p_a", title: "알파" })], { hasNext: true }),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<ChildPagesSection pageId={SELF} spaceId={SPACE} />, { wrapper: Wrapper });

    expect(await screen.findByText(/최대 100개까지 표시/)).toBeInTheDocument();
  });
});
