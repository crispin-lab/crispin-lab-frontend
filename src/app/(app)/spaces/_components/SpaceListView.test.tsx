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

import { SpaceListView } from "./SpaceListView";

type Overrides = {
  totalPages?: number;
  hasNext?: boolean;
  page?: number;
  totalElements?: number;
};

function buildSpaceListResponse(
  items: ReadonlyArray<Partial<Record<string, unknown>>>,
  overrides: Overrides = {},
) {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: overrides.totalPages ?? (items.length === 0 ? 0 : 1),
    hasNext: overrides.hasNext ?? false,
    page: overrides.page ?? 0,
    totalElements: overrides.totalElements ?? items.length,
    items: items.map((item) => ({
      createdAt: "2026-01-01T00:00:00Z",
      spaceId: "s_1",
      visibility: "PUBLIC",
      name: "공개 스페이스",
      description: "설명",
      pageCount: 5,
      memberCount: 3,
      myRole: null,
      lastActivityAt: "2026-06-01T00:00:00Z",
      ...item,
    })),
  };
}

function setSearchParams(input: Record<string, string> | string) {
  searchParamsState.current = new URLSearchParams(input);
}

describe("SpaceListView", () => {
  beforeEach(() => {
    routerPush.mockReset();
    setSearchParams({});
  });

  it("결과가 있으면 카드 목록으로 렌더한다", async () => {
    server.use(http.get("*/api/v1/spaces", () => HttpResponse.json(buildSpaceListResponse([{}]))));

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={true} />, { wrapper: Wrapper });

    expect(await screen.findByText("공개 스페이스")).toBeInTheDocument();
    expect(screen.getByText("설명")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위: 공개/)).toBeInTheDocument();
    const time = document.querySelector('time[datetime="2026-06-01T00:00:00Z"]');
    expect(time).not.toBeNull();
    expect(time?.parentElement?.textContent).toMatch(/^최근 활동 \d{4}\. \d{2}\. \d{2}\./);
    expect(screen.getByRole("link", { name: /공개 스페이스 스페이스로 이동/ })).toHaveAttribute(
      "href",
      "/spaces/s_1",
    );
  });

  it("결과가 비어 있으면 빈 상태 안내 + 첫 스페이스 CTA 를 보여준다", async () => {
    server.use(http.get("*/api/v1/spaces", () => HttpResponse.json(buildSpaceListResponse([]))));

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={true} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 스페이스가 없습니다.")).toBeInTheDocument();
    // base-ui Button + render={<Link/>} 은 <a role="button"> 로 렌더 — accessible role 은 button.
    expect(screen.getByRole("button", { name: "첫 스페이스 만들기" })).toHaveAttribute(
      "href",
      "/spaces/new",
    );
  });

  it("keyword 가 있는 빈 결과는 '검색 결과 없음' 문구로 분기한다 (일반 empty 와 다른 UX)", async () => {
    setSearchParams({ keyword: "존재하지-않는" });
    server.use(http.get("*/api/v1/spaces", () => HttpResponse.json(buildSpaceListResponse([]))));

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={true} />, { wrapper: Wrapper });

    expect(await screen.findByText(/존재하지-않는/)).toBeInTheDocument();
    expect(screen.getByText(/일치하는 스페이스가 없습니다/)).toBeInTheDocument();
    // 검색 결과 없음은 '첫 스페이스 만들기' 를 노출하지 않는다 (검색어 조정이 다음 액션).
    // 텍스트 기반 negative — CTA 가 button role 이든 link role 이든 관계없이 "미노출" 을 검증한다.
    expect(screen.queryByText("첫 스페이스 만들기")).not.toBeInTheDocument();
  });

  it("에러면 백엔드 메시지를 노출하고 다시 시도 버튼을 보여준다", async () => {
    let hits = 0;
    server.use(
      http.get("*/api/v1/spaces", () => {
        hits += 1;
        if (hits === 1) {
          return HttpResponse.json(
            { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
            { status: 500 },
          );
        }
        return HttpResponse.json(buildSpaceListResponse([]));
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceListView isAuthenticated={true} />, { wrapper: Wrapper });

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(screen.getByText("아직 스페이스가 없습니다.")).toBeInTheDocument());
  });

  it("비로그인이면 '새 스페이스 만들기' CTA 가 숨고 헤딩이 '공개 스페이스' 로 바뀐다", async () => {
    server.use(http.get("*/api/v1/spaces", () => HttpResponse.json(buildSpaceListResponse([{}]))));

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={false} />, { wrapper: Wrapper });

    expect(await screen.findByRole("heading", { name: "공개 스페이스" })).toBeInTheDocument();
    expect(screen.queryByText("새 스페이스 만들기")).not.toBeInTheDocument();
  });

  it("비로그인 + 빈 결과면 카피가 '공개된 스페이스가 없습니다' 로 바뀌고 CTA 가 안 나온다", async () => {
    server.use(http.get("*/api/v1/spaces", () => HttpResponse.json(buildSpaceListResponse([]))));

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={false} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 공개된 스페이스가 없습니다.")).toBeInTheDocument();
    // 텍스트 기반 negative — CTA 가 button role 이든 link role 이든 관계없이 "미노출" 을 검증한다.
    expect(screen.queryByText("첫 스페이스 만들기")).not.toBeInTheDocument();
  });

  it("총 N개 카운트가 노출된다 (결과 요약 요구)", async () => {
    server.use(
      http.get("*/api/v1/spaces", () =>
        HttpResponse.json(
          buildSpaceListResponse([{}, { spaceId: "s_2", name: "다른" }], { totalElements: 12 }),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={true} />, { wrapper: Wrapper });

    const totalCount = await screen.findByRole("status");
    await waitFor(() => expect(totalCount).toHaveTextContent("총 12개"));
  });

  it("URL 에 keyword / sort / page 가 있으면 그 값으로 백엔드를 호출한다", async () => {
    let capturedUrl: URL | undefined;
    setSearchParams({ keyword: "위키", sort: "NAME", page: "2" });
    server.use(
      http.get("*/api/v1/spaces", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(buildSpaceListResponse([], { totalPages: 3, page: 2 }));
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView isAuthenticated={true} />, { wrapper: Wrapper });

    await waitFor(() => expect(capturedUrl).toBeDefined());
    expect(capturedUrl?.searchParams.get("keyword")).toBe("위키");
    expect(capturedUrl?.searchParams.get("sort")).toBe("NAME");
    expect(capturedUrl?.searchParams.get("page")).toBe("2");
    expect(capturedUrl?.searchParams.get("size")).toBe("20");
  });
});
