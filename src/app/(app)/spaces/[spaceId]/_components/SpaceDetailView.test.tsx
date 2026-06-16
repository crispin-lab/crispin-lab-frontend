import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import type { Space } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

// 실제 notFound() 는 throw 하지만, 테스트는 호출 사실만 검증하고 fall-through 렌더는
// 무시한다 (jsdom 에 ErrorBoundary 가 없어 throw 시 unhandled).
const { notFoundMock, routerPush } = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  routerPush: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ push: routerPush }),
}));

import { SpaceDetailView } from "./SpaceDetailView";

const SPACE_ID_RAW = "s_1";
const SPACE_ID = asSpaceId(SPACE_ID_RAW);

function spaceBody(overrides: Partial<Space> = {}): Space {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: SPACE_ID_RAW,
    visibility: "PUBLIC",
    name: "공개 위키",
    description: "공개 위키 설명",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function pageListBody(items: Array<{ pageId: string; title: string; updatedAt: string }>) {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items: items.map((item) => ({ ...item, spaceId: SPACE_ID_RAW })),
    totalElements: items.length,
  };
}

beforeEach(() => {
  notFoundMock.mockClear();
  routerPush.mockReset();
  toastError.mockReset();
});

describe("SpaceDetailView", () => {
  it("메타 + 페이지 목록을 모두 렌더한다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageListBody([
            { pageId: "p_1", title: "첫 페이지", updatedAt: "2026-05-01T00:00:00Z" },
            { pageId: "p_2", title: "두 번째 페이지", updatedAt: "2026-05-02T00:00:00Z" },
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByRole("heading", { name: "공개 위키" })).toBeInTheDocument();
    expect(screen.getByText("공개 위키 설명")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위: 공개/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /첫 페이지/ })).toHaveAttribute("href", "/pages/p_1");
    expect(screen.getByRole("link", { name: /두 번째 페이지/ })).toHaveAttribute(
      "href",
      "/pages/p_2",
    );
  });

  it("빈 페이지 목록이면 헤더 CTA 는 숨고 빈 카드의 '첫 페이지 만들기' 만 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 페이지가 없습니다.")).toBeInTheDocument();
    // base-ui Button + render={<Link/>} 은 <a role="button"> 로 렌더 — accessible role 은 button.
    expect(screen.getByRole("button", { name: "첫 페이지 만들기" })).toHaveAttribute(
      "href",
      `/pages/new?spaceId=${SPACE_ID_RAW}`,
    );
    expect(screen.queryByRole("button", { name: "새 페이지 만들기" })).not.toBeInTheDocument();
  });

  it("페이지 목록이 비어있지 않으면 헤더에 '새 페이지 만들기' CTA 가 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageListBody([{ pageId: "p_1", title: "p1", updatedAt: "2026-05-01T00:00:00Z" }]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByRole("button", { name: "새 페이지 만들기" })).toHaveAttribute(
      "href",
      `/pages/new?spaceId=${SPACE_ID_RAW}`,
    );
  });

  it("스페이스 404 → notFound() 로 흡수 (존재 비노출)", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json(
          { code: "SPACE_NOT_FOUND", message: "스페이스를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    await waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });

  it("스페이스 403 도 notFound() 로 흡수 (권한 부재 = 미존재와 동일 처리)", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다." }, { status: 403 }),
      ),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    await waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });

  it("스페이스 500 이면 메시지 + 다시 시도 버튼을 보여주고, 재시도 성공 시 메타가 노출된다", async () => {
    let hits = 0;
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => {
        hits += 1;
        if (hits === 1) {
          return HttpResponse.json(
            { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
            { status: 500 },
          );
        }
        return HttpResponse.json(spaceBody());
      }),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(notFoundMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "공개 위키" })).toBeInTheDocument(),
    );
  });

  it("페이지 목록만 500 이고 메타는 정상이면 메타와 페이지 목록 에러 카드가 함께 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "페이지 목록을 불러오지 못했습니다." },
          { status: 500 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByRole("heading", { name: "공개 위키" })).toBeInTheDocument();
    expect(screen.getByText("페이지 목록을 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("⋯ → 스페이스 삭제 → 확인 시 DELETE 호출 + /spaces 로 이동", async () => {
    let deleted = false;
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      http.delete(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "공개 위키" });
    await user.click(screen.getByRole("button", { name: "더보기" }));
    await user.click(await screen.findByRole("menuitem", { name: "스페이스 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/spaces"));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("삭제 dialog 의 취소를 누르면 DELETE 가 호출되지 않는다", async () => {
    let hits = 0;
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      http.delete(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => {
        hits += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "공개 위키" });
    await user.click(screen.getByRole("button", { name: "더보기" }));
    await user.click(await screen.findByRole("menuitem", { name: "스페이스 삭제" }));
    await user.click(await screen.findByRole("button", { name: "취소" }));

    expect(hits).toBe(0);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("스페이스 삭제 실패 시 toast 가 백엔드 message 로 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      http.delete(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "삭제 권한이 없습니다." }, { status: 403 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceDetailView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "공개 위키" });
    await user.click(screen.getByRole("button", { name: "더보기" }));
    await user.click(await screen.findByRole("menuitem", { name: "스페이스 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("삭제 권한이 없습니다."));
    expect(routerPush).not.toHaveBeenCalled();
  });
});
