import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

// hoisted 객체는 worker 수명. beforeEach 에서 current 재할당으로 테스트 간 누수 차단.
const { routerPush, searchParamsState } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  searchParamsState: { current: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => searchParamsState.current,
}));

import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { SearchResultsView } from "./SearchResultsView";

function buildPageSearchResponse(
  items: ReadonlyArray<Record<string, unknown>>,
  overrides: { totalPages?: number; hasNext?: boolean; page?: number } = {},
) {
  return {
    size: 10,
    isEmpty: items.length === 0,
    totalPages: overrides.totalPages ?? (items.length === 0 ? 0 : 1),
    hasNext: overrides.hasNext ?? false,
    page: overrides.page ?? 0,
    totalElements: items.length,
    items,
  };
}

function buildSpaceListResponse(items: ReadonlyArray<{ spaceId: string; name: string }>) {
  return {
    items: items.map((space) => ({
      spaceId: space.spaceId,
      name: space.name,
      description: "",
      visibility: "PUBLIC",
      updatedAt: "2026-01-01T00:00:00Z",
    })),
  };
}

function setSearchParams(input: Record<string, string> | string) {
  searchParamsState.current = new URLSearchParams(input);
}

describe("SearchResultsView", () => {
  beforeEach(() => {
    routerPush.mockReset();
    setSearchParams({});
    server.use(
      http.get("*/api/v1/spaces", () =>
        HttpResponse.json(buildSpaceListResponse([{ spaceId: "s_1", name: "개인 노트" }])),
      ),
    );
  });

  it("결과가 있으면 제목과 결과 건수를 노출한다", async () => {
    setSearchParams({ query: "위키" });
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          buildPageSearchResponse([
            {
              spaceId: "s_1",
              displayOrder: 0,
              title: "TipTap 위키 링크 구현 메모",
              pageId: "p_1",
              updatedAt: "2026-05-22T00:00:00Z",
            },
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SearchResultsView />, { wrapper: Wrapper });

    expect(await screen.findByText("TipTap 위키 링크 구현 메모")).toBeInTheDocument();
    expect(screen.getByText("결과 1건")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TipTap 위키 링크 구현 메모/ })).toHaveAttribute(
      "href",
      "/pages/p_1",
    );
  });

  it("결과가 비면 query 와 함께 안내 문구를 노출한다", async () => {
    setSearchParams({ query: "없는키워드" });
    server.use(http.get("*/api/v1/pages", () => HttpResponse.json(buildPageSearchResponse([]))));

    const { Wrapper } = createQueryWrapper();
    render(<SearchResultsView />, { wrapper: Wrapper });

    expect(await screen.findByText(/없는키워드.*에 대한 검색 결과가 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/다른 검색어를 시도해 보세요/)).toBeInTheDocument();
  });

  it("에러 응답이면 ErrorRetryCard 를 보여준다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
          { status: 500 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SearchResultsView />, { wrapper: Wrapper });

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("정렬 변경 시 page=0 으로 리셋된 URL 로 push 한다", async () => {
    setSearchParams({ query: "위키", page: "3" });
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          buildPageSearchResponse(
            [
              {
                spaceId: "s_1",
                displayOrder: 0,
                title: "TipTap 위키 링크 구현 메모",
                pageId: "p_1",
                updatedAt: "2026-05-22T00:00:00Z",
              },
            ],
            { totalPages: 4, page: 3 },
          ),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SearchResultsView />, { wrapper: Wrapper });

    await screen.findByText("TipTap 위키 링크 구현 메모");
    await user.click(screen.getByRole("combobox", { name: "정렬" }));
    await user.click(await screen.findByRole("option", { name: "관련도순" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledTimes(1));
    expect(routerPush).toHaveBeenCalledWith("/search?query=%EC%9C%84%ED%82%A4&sort=RELEVANCE");
  });

  it("다음 페이지 는 page+1 URL 을 가리키는 링크다", async () => {
    setSearchParams({ query: "위키" });
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          buildPageSearchResponse(
            [
              {
                spaceId: "s_1",
                displayOrder: 0,
                title: "TipTap 위키 링크 구현 메모",
                pageId: "p_1",
                updatedAt: "2026-05-22T00:00:00Z",
              },
            ],
            { totalPages: 4, hasNext: true, page: 0 },
          ),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SearchResultsView />, { wrapper: Wrapper });

    await screen.findByText("TipTap 위키 링크 구현 메모");
    // base-ui Button + render={<Link/>} 는 role="button" 인 <a href> — RTL 로 button 으로 매칭.
    expect(screen.getByRole("button", { name: "다음 페이지" })).toHaveAttribute(
      "href",
      "/search?query=%EC%9C%84%ED%82%A4&page=1",
    );
    expect(screen.getByRole("button", { name: "이전 페이지" })).toBeDisabled();
  });

  it("페이지 번호 버튼은 해당 page 의 URL href 를 갖는다", async () => {
    setSearchParams({ query: "위키" });
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          buildPageSearchResponse(
            [
              {
                spaceId: "s_1",
                displayOrder: 0,
                title: "TipTap 위키 링크 구현 메모",
                pageId: "p_1",
                updatedAt: "2026-05-22T00:00:00Z",
              },
            ],
            { totalPages: 4, hasNext: true, page: 0 },
          ),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SearchResultsView />, { wrapper: Wrapper });

    await screen.findByText("TipTap 위키 링크 구현 메모");
    expect(screen.getByRole("button", { name: "3페이지" })).toHaveAttribute(
      "href",
      "/search?query=%EC%9C%84%ED%82%A4&page=2",
    );
    const currentBtn = screen.getByRole("button", { name: /1페이지/ });
    expect(currentBtn).toHaveAttribute("aria-current", "page");
    expect(currentBtn).toHaveAttribute("aria-disabled");
    expect(currentBtn).not.toHaveAttribute("href");
  });

  it("페이지가 한 개뿐이면 pagination 컴포넌트를 렌더하지 않는다", async () => {
    setSearchParams({ query: "위키" });
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          buildPageSearchResponse(
            [
              {
                spaceId: "s_1",
                displayOrder: 0,
                title: "TipTap 위키 링크 구현 메모",
                pageId: "p_1",
                updatedAt: "2026-05-22T00:00:00Z",
              },
            ],
            { totalPages: 1, hasNext: false, page: 0 },
          ),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SearchResultsView />, { wrapper: Wrapper });

    await screen.findByText("TipTap 위키 링크 구현 메모");
    expect(screen.queryByRole("navigation", { name: "검색 결과 페이지" })).not.toBeInTheDocument();
  });
});
