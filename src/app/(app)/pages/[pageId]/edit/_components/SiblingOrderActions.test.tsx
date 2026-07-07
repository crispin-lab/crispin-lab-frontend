import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { SiblingOrderActions } from "./SiblingOrderActions";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const SPACE = asSpaceId("s_1");
const PARENT = asPageId("p_parent");

function pageSummary(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: "p_parent",
    displayOrder: 0,
    authorHandle: "crispin",
    title: "형제",
    authorId: "u_1",
    pageId: "p_x",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function pageSearchBody(items: PageSummary[]): PageSearchResult {
  return {
    size: 100,
    isEmpty: items.length === 0,
    totalPages: 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
  };
}

function setupSiblings(items: PageSummary[]) {
  server.use(http.get("*/api/v1/pages", () => HttpResponse.json(pageSearchBody(items))));
}

describe("SiblingOrderActions", () => {
  beforeEach(() => {
    // 기본 — 3형제 중 중간 위치 (자기 p_mid).
    setupSiblings([
      pageSummary({ pageId: "p_a", title: "형 A", displayOrder: 0 }),
      pageSummary({ pageId: "p_mid", title: "나", displayOrder: 1 }),
      pageSummary({ pageId: "p_z", title: "형 Z", displayOrder: 2 }),
    ]);
  });

  it("형제가 1개 (자기 자신) 뿐이면 trigger 가 비활성이다", async () => {
    setupSiblings([pageSummary({ pageId: "p_solo", title: "혼자" })]);
    const { Wrapper } = createQueryWrapper();
    render(
      <SiblingOrderActions pageId={asPageId("p_solo")} spaceId={SPACE} parentPageId={PARENT} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "형제 페이지 순서 변경" })).toBeDisabled();
    });
  });

  it("첫 위치면 '맨 앞으로' / '앞으로 이동' 이 disabled 다", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<SiblingOrderActions pageId={asPageId("p_a")} spaceId={SPACE} parentPageId={PARENT} />, {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "형제 페이지 순서 변경" })).not.toBeDisabled(),
    );
    await user.click(screen.getByRole("button", { name: "형제 페이지 순서 변경" }));

    expect(await screen.findByRole("menuitem", { name: /맨 앞으로/ })).toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByRole("menuitem", { name: /앞으로 이동/ })).toHaveAttribute("data-disabled");
    expect(screen.getByRole("menuitem", { name: /뒤로 이동/ })).not.toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByRole("menuitem", { name: /맨 뒤로/ })).not.toHaveAttribute("data-disabled");
  });

  it("마지막 위치면 '맨 뒤로' / '뒤로 이동' 이 disabled 다", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<SiblingOrderActions pageId={asPageId("p_z")} spaceId={SPACE} parentPageId={PARENT} />, {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "형제 페이지 순서 변경" })).not.toBeDisabled(),
    );
    await user.click(screen.getByRole("button", { name: "형제 페이지 순서 변경" }));

    expect(await screen.findByRole("menuitem", { name: /맨 뒤로/ })).toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByRole("menuitem", { name: /뒤로 이동/ })).toHaveAttribute("data-disabled");
    expect(screen.getByRole("menuitem", { name: /맨 앞으로/ })).not.toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByRole("menuitem", { name: /앞으로 이동/ })).not.toHaveAttribute(
      "data-disabled",
    );
  });

  it("'앞으로 이동' 클릭 시 currentIdx - 1 값으로 reorder 요청이 나간다", async () => {
    const user = userEvent.setup();
    let sentDisplayOrder: number | undefined;
    server.use(
      http.put("*/api/v1/pages/p_mid/order", async ({ request }) => {
        const body = (await request.json()) as { displayOrder: number };
        sentDisplayOrder = body.displayOrder;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(
      <SiblingOrderActions pageId={asPageId("p_mid")} spaceId={SPACE} parentPageId={PARENT} />,
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "형제 페이지 순서 변경" })).not.toBeDisabled(),
    );
    await user.click(screen.getByRole("button", { name: "형제 페이지 순서 변경" }));
    await user.click(await screen.findByRole("menuitem", { name: /앞으로 이동/ }));

    await waitFor(() => expect(sentDisplayOrder).toBe(0));
  });

  it("'맨 뒤로' 클릭 시 마지막 index (N-1) 로 요청이 나간다", async () => {
    const user = userEvent.setup();
    let sentDisplayOrder: number | undefined;
    server.use(
      http.put("*/api/v1/pages/p_mid/order", async ({ request }) => {
        const body = (await request.json()) as { displayOrder: number };
        sentDisplayOrder = body.displayOrder;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(
      <SiblingOrderActions pageId={asPageId("p_mid")} spaceId={SPACE} parentPageId={PARENT} />,
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "형제 페이지 순서 변경" })).not.toBeDisabled(),
    );
    await user.click(screen.getByRole("button", { name: "형제 페이지 순서 변경" }));
    await user.click(await screen.findByRole("menuitem", { name: /맨 뒤로/ }));

    // 3형제 → 마지막 index = 2.
    await waitFor(() => expect(sentDisplayOrder).toBe(2));
  });
});
