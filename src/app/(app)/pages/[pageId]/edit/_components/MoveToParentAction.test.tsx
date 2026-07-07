import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { MoveToParentAction } from "./MoveToParentAction";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const SPACE = asSpaceId("s_1");
const SELF = asPageId("p_self");

function pageSummary(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: null,
    displayOrder: 0,
    authorHandle: "crispin",
    title: "페이지",
    authorId: "u_1",
    pageId: "p_1",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function pageSearchBody(items: PageSummary[]): PageSearchResult {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
  };
}

describe("MoveToParentAction", () => {
  beforeEach(() => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageSearchBody([
            pageSummary({ pageId: "p_self", title: "자기 자신" }),
            pageSummary({ pageId: "p_alpha", title: "알파" }),
            pageSummary({ pageId: "p_beta", title: "베타" }),
          ]),
        ),
      ),
    );
  });

  it("트리거를 클릭하면 dialog 가 열린다", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<MoveToParentAction pageId={SELF} spaceId={SPACE} currentParent={null} />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByRole("button", { name: "부모 페이지 변경…" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("부모 페이지 변경")).toBeInTheDocument();
  });

  it("current parent 가 있으면 picker 에 프리셋으로 표시된다", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(
      <MoveToParentAction
        pageId={SELF}
        spaceId={SPACE}
        currentParent={{ pageId: "p_alpha", title: "알파" }}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole("button", { name: "부모 페이지 변경…" }));
    await screen.findByRole("alertdialog");

    // picker trigger 가 "알파" 를 노출.
    expect(screen.getByRole("button", { name: "부모 페이지 선택" })).toHaveTextContent("알파");
  });

  it("current parent 와 같은 값이 선택된 상태면 이동 버튼이 disabled 다", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(
      <MoveToParentAction
        pageId={SELF}
        spaceId={SPACE}
        currentParent={{ pageId: "p_alpha", title: "알파" }}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole("button", { name: "부모 페이지 변경…" }));
    await screen.findByRole("alertdialog");

    expect(screen.getByRole("button", { name: "이동" })).toBeDisabled();
  });

  it("picker 에서 자기 자신은 후보로 노출되지 않는다 (excludePageIds)", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(<MoveToParentAction pageId={SELF} spaceId={SPACE} currentParent={null} />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByRole("button", { name: "부모 페이지 변경…" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));

    await waitFor(() => expect(screen.getByRole("option", { name: "알파" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: "자기 자신" })).not.toBeInTheDocument();
  });

  it("current parent 도 후보로 노출되지 않는다 (PAGE_PARENT_UNCHANGED 예방)", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createQueryWrapper();
    render(
      <MoveToParentAction
        pageId={SELF}
        spaceId={SPACE}
        currentParent={{ pageId: "p_alpha", title: "알파" }}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole("button", { name: "부모 페이지 변경…" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));

    // 다른 후보 (베타) 는 정상 노출, current parent (알파) 는 제외.
    await waitFor(() => expect(screen.getByRole("option", { name: "베타" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: "알파" })).not.toBeInTheDocument();
  });

  it("새 부모 선택 후 이동 확인 시 parentPageId 로 mutation 이 나가고 dialog 가 닫힌다", async () => {
    const user = userEvent.setup();
    let sentParentPageId: string | null | undefined;
    server.use(
      http.put("*/api/v1/pages/p_self/parent", async ({ request }) => {
        const body = (await request.json()) as { parentPageId: string | null };
        sentParentPageId = body.parentPageId;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(<MoveToParentAction pageId={SELF} spaceId={SPACE} currentParent={null} />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByRole("button", { name: "부모 페이지 변경…" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await user.click(await screen.findByRole("option", { name: "알파" }));
    await user.click(screen.getByRole("button", { name: "이동" }));

    await waitFor(() => expect(sentParentPageId).toBe("p_alpha"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
