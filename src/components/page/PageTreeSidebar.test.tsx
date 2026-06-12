import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { PageTreeSidebar } from "./PageTreeSidebar";

function summary(input: {
  pageId: string;
  title: string;
  parentPageId?: string | null;
  displayOrder?: number;
}): PageSummary {
  return {
    pageId: input.pageId,
    spaceId: "s_1",
    title: input.title,
    updatedAt: "2026-01-01T00:00:00Z",
    displayOrder: input.displayOrder ?? 0,
    parentPageId: input.parentPageId ?? null,
    authorHandle: "author",
    authorId: "u_1",
    visibility: "PUBLIC",
  };
}

function listResponse(items: PageSummary[], hasNext = false): PageSearchResult {
  return {
    size: 200,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext,
    page: 0,
    items,
    totalElements: items.length,
  };
}

function renderSidebar(activePageId = "p_active") {
  const { Wrapper } = createQueryWrapper();
  return render(
    <PageTreeSidebar spaceId={asSpaceId("s_1")} activePageId={asPageId(activePageId)} />,
    { wrapper: Wrapper },
  );
}

describe("PageTreeSidebar", () => {
  it("로딩 중에는 skeleton 만 노출되고 트리 / 안내가 보이지 않는다", () => {
    // 응답을 일부러 미해결 promise 로 만들어 isPending 을 고정.
    server.use(http.get("*/api/v1/pages", () => new Promise(() => {})));
    const { container } = renderSidebar();

    expect(container.querySelector('ul[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole("link", { name: /만들기/ })).not.toBeInTheDocument();
  });

  it("에러 응답이면 ErrorRetryCard 가 노출되고 다시 시도 버튼이 새 요청을 트리거한다", async () => {
    let attempts = 0;
    server.use(
      http.get("*/api/v1/pages", () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { code: "INTERNAL_ERROR", message: "트리를 불러오지 못했습니다." },
            { status: 500 },
          );
        }
        return HttpResponse.json(listResponse([summary({ pageId: "p_a", title: "복구" })]));
      }),
    );

    renderSidebar();

    expect(await screen.findByText("트리를 불러오지 못했습니다.")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /다시 시도/ });
    await userEvent.setup().click(retry);

    expect(await screen.findByRole("link", { name: "복구" })).toBeInTheDocument();
  });

  it("빈 응답이면 안내 문구 + '첫 페이지 만들기' CTA 가 노출된다", async () => {
    server.use(http.get("*/api/v1/pages", () => HttpResponse.json(listResponse([]))));
    renderSidebar();

    expect(await screen.findByText(/아직 페이지가 없습니다/)).toBeInTheDocument();
    // shadcn Button + Link 합성 — anchor 가 role="button" 으로 노출된다.
    const cta = screen.getByRole("button", { name: "첫 페이지 만들기" });
    expect(cta).toHaveAttribute("href", "/pages/new?spaceId=s_1");
  });

  it("트리 응답이면 페이지 목록과 active 페이지가 같이 노출된다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          listResponse([
            summary({ pageId: "p_root", title: "루트" }),
            summary({ pageId: "p_active", title: "활성", parentPageId: "p_root" }),
          ]),
        ),
      ),
    );
    renderSidebar();

    const tree = await screen.findByRole("list", { name: "페이지 트리" });
    expect(tree).toBeInTheDocument();
    // active 의 조상이 자동 펼쳐져 자식까지 노출.
    expect(await screen.findByRole("link", { name: "활성" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "루트" })).toBeInTheDocument();
  });

  it("hasNext = true 면 잘림 안내가 노출되고, false 면 노출되지 않는다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          listResponse([summary({ pageId: "p_only", title: "유일" })], /* hasNext */ true),
        ),
      ),
    );
    const { rerender } = renderSidebar();
    expect(await screen.findByText(/스페이스가 커서 일부만 표시됩니다/)).toBeInTheDocument();

    // false 응답으로 갈아끼우고 새 wrapper 로 재마운트.
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          listResponse([summary({ pageId: "p_only", title: "유일" })], /* hasNext */ false),
        ),
      ),
    );
    const { Wrapper: WrapperB } = createQueryWrapper();
    rerender(
      <WrapperB>
        <PageTreeSidebar spaceId={asSpaceId("s_1")} activePageId={asPageId("p_active")} />
      </WrapperB>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/스페이스가 커서 일부만 표시됩니다/)).not.toBeInTheDocument();
    });
  });
});
