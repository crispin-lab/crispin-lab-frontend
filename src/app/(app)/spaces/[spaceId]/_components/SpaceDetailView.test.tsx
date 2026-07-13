import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { spaceBody as baseSpaceBody } from "@/test/fixtures/space";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { Space } from "@/lib/api/types";

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
  return baseSpaceBody({
    spaceId: SPACE_ID_RAW,
    name: "공개 위키",
    description: "공개 위키 설명",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  });
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
  // LAB-95 이후 SpaceDetailView 가 useMe + useSpaceMemberList 를 호출 — 각 케이스에서 override 하지 않는 한
  // /v1/users/me 는 401 (anonymous), 멤버 리스트 fetch 는 useMe 가 null 이라 enabled=false 로 skip 된다.
  // authenticated 진입 시 방문 기록 POST 가 mount 에서 자동 발화 — 기본 handler 로 조용히 204.
  server.use(
    http.get("*/api/v1/users/me", () =>
      HttpResponse.json({ code: "INVALID_SESSION", message: "no session" }, { status: 401 }),
    ),
    http.post(
      `*/api/v1/spaces/${SPACE_ID_RAW}/visits`,
      () => new HttpResponse(null, { status: 204 }),
    ),
  );
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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

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
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "공개 위키" });
    await user.click(screen.getByRole("button", { name: "더보기" }));
    await user.click(await screen.findByRole("menuitem", { name: "스페이스 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("삭제 권한이 없습니다."));
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("비로그인이면 ⋯ 더보기 / 새 페이지 만들기 CTA 가 숨는다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json(spaceBody({ canWrite: false })),
      ),
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageListBody([{ pageId: "p_1", title: "p1", updatedAt: "2026-05-01T00:00:00Z" }]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={false} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "공개 위키" });
    expect(screen.queryByRole("button", { name: "더보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "새 페이지 만들기" })).not.toBeInTheDocument();
  });

  it("비로그인 + 빈 페이지 목록이면 '첫 페이지 만들기' CTA 가 안 보이고 카피가 바뀐다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json(spaceBody({ canWrite: false })),
      ),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={false} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 공개된 페이지가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "첫 페이지 만들기" })).not.toBeInTheDocument();
  });

  it("로그인이지만 canWrite 가 false 면 '새 페이지 만들기' CTA 가 숨는다 (VIEWER 멤버)", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json(spaceBody({ canWrite: false })),
      ),
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageListBody([{ pageId: "p_1", title: "p1", updatedAt: "2026-05-01T00:00:00Z" }]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "공개 위키" });
    expect(screen.queryByRole("button", { name: "새 페이지 만들기" })).not.toBeInTheDocument();
  });

  it("로그인 + canWrite false + 빈 목록이면 '첫 페이지 만들기' CTA 가 숨는다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
        HttpResponse.json(spaceBody({ canWrite: false })),
      ),
      http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 페이지가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "첫 페이지 만들기" })).not.toBeInTheDocument();
  });

  describe("LAB-172 · 편집 이력 진입 액션", () => {
    it("canEdit 이면 ⋯ 더보기 안에 '편집 이력' 링크가 audit-log 로 노출된다 (편집 이력 → 삭제 순)", async () => {
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
          HttpResponse.json(spaceBody({ canEdit: true })),
        ),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      );

      const { Wrapper } = createQueryWrapper();
      const user = userEvent.setup();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      await user.click(screen.getByRole("button", { name: "더보기" }));

      const auditLink = await screen.findByRole("menuitem", { name: "편집 이력" });
      expect(auditLink).toHaveAttribute("href", `/spaces/${SPACE_ID_RAW}/audit-log`);

      // 순서 검증 — 편집 이력이 스페이스 삭제보다 위.
      const menuItems = screen.getAllByRole("menuitem");
      const auditIndex = menuItems.findIndex((item) => item.textContent === "편집 이력");
      const deleteIndex = menuItems.findIndex((item) => item.textContent === "스페이스 삭제");
      expect(auditIndex).toBeGreaterThanOrEqual(0);
      expect(deleteIndex).toBeGreaterThan(auditIndex);
    });

    it("canEdit 이 false 이면 '편집 이력' 액션이 노출되지 않는다", async () => {
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
          HttpResponse.json(spaceBody({ canEdit: false })),
        ),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      );

      const { Wrapper } = createQueryWrapper();
      const user = userEvent.setup();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      await user.click(screen.getByRole("button", { name: "더보기" }));

      // menu 는 열렸지만 편집 이력 항목은 없어야 한다.
      expect(await screen.findByRole("menuitem", { name: "스페이스 삭제" })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "편집 이력" })).not.toBeInTheDocument();
    });
  });

  describe("LAB-95 · 멤버 관리 진입점", () => {
    it("OWNER 시점에는 '멤버' 진입점 버튼이 노출된다", async () => {
      server.use(
        http.get("*/api/v1/users/me", () =>
          HttpResponse.json({ userId: "u_owner", handle: "owner", email: "o@x", role: "USER" }),
        ),
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
          HttpResponse.json({
            size: 20,
            isEmpty: false,
            totalPages: 1,
            hasNext: false,
            page: 0,
            items: [
              {
                spaceMemberId: "sm_1",
                spaceId: SPACE_ID_RAW,
                userId: "u_owner",
                handle: "owner",
                role: "OWNER",
                joinedAt: "2026-01-01T00:00:00Z",
              },
            ],
            totalElements: 1,
          }),
        ),
      );

      const { Wrapper } = createQueryWrapper();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      const memberLink = await screen.findByRole("button", { name: /^멤버$/ });
      expect(memberLink).toHaveAttribute("href", `/spaces/${SPACE_ID_RAW}/members`);
    });

    it("MEMBER 시점에는 '멤버' 진입점 버튼이 노출되지 않는다", async () => {
      server.use(
        http.get("*/api/v1/users/me", () =>
          HttpResponse.json({ userId: "u_member", handle: "member", email: "m@x", role: "USER" }),
        ),
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
          HttpResponse.json({
            size: 20,
            isEmpty: false,
            totalPages: 1,
            hasNext: false,
            page: 0,
            items: [
              {
                spaceMemberId: "sm_1",
                spaceId: SPACE_ID_RAW,
                userId: "u_member",
                handle: "member",
                role: "MEMBER",
                joinedAt: "2026-01-01T00:00:00Z",
              },
            ],
            totalElements: 1,
          }),
        ),
      );

      const { Wrapper } = createQueryWrapper();
      const { container } = render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, {
        wrapper: Wrapper,
      });

      await screen.findByRole("heading", { name: "공개 위키" });
      // 역할 확정 (memberList 응답 도착) 으로 skeleton 이 사라진 뒤에 부정 단언 —
      // skeleton 단계에서 조기 통과하는 false-positive 방지.
      const header = container.querySelector('[aria-labelledby="space-meta-heading"]');
      await waitFor(() => expect(header?.querySelector('[data-slot="skeleton"]')).toBeNull());
      expect(screen.queryByRole("button", { name: /^멤버$/ })).not.toBeInTheDocument();
    });

    it("useMe pending 상태에서는 진입점 자리에 skeleton 이 놓여 flicker 를 막는다", async () => {
      // /v1/users/me 를 hang 시켜 meQuery.isPending 을 유지 → skeleton 이 유지되어야 한다.
      server.use(
        http.get("*/api/v1/users/me", () => new Promise<Response>(() => {})),
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      );

      const { Wrapper } = createQueryWrapper();
      const { container } = render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, {
        wrapper: Wrapper,
      });

      await screen.findByRole("heading", { name: "공개 위키" });
      // skeleton placeholder 가 진입점 자리에 있어야 한다 — meta / page skeleton 과 구분 위해 헤더 안에서 찾는다.
      const header = container.querySelector('[aria-labelledby="space-meta-heading"]');
      expect(header).not.toBeNull();
      expect(header?.querySelector('[data-slot="skeleton"]')).not.toBeNull();
      // 진짜 진입점 버튼은 아직 없다.
      expect(screen.queryByRole("button", { name: /^멤버$/ })).not.toBeInTheDocument();
    });

    it("비로그인 방문자에게는 멤버 리스트 fetch 자체가 발생하지 않는다", async () => {
      let memberListHits = 0;
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
          HttpResponse.json(spaceBody({ canWrite: false })),
        ),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () => {
          memberListHits += 1;
          return HttpResponse.json({
            size: 20,
            isEmpty: true,
            totalPages: 0,
            hasNext: false,
            page: 0,
            items: [],
            totalElements: 0,
          });
        }),
      );

      const { Wrapper } = createQueryWrapper();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={false} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      // useSpaceMemberList 의 enabled 가 false 라 fetch 안 됨.
      expect(memberListHits).toBe(0);
      expect(screen.queryByRole("button", { name: /^멤버$/ })).not.toBeInTheDocument();
    });
  });

  describe("LAB-178 · 방문 자동 기록", () => {
    it("authenticated 진입 시 POST /visits 가 한 번 발화된다 (fire-and-forget)", async () => {
      let visitHits = 0;
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
        http.post(`*/api/v1/spaces/${SPACE_ID_RAW}/visits`, () => {
          visitHits += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const { Wrapper } = createQueryWrapper();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      await waitFor(() => expect(visitHits).toBe(1));
    });

    it("비로그인 진입 시 POST /visits 가 발화되지 않는다 (backend 가 401 로 거절)", async () => {
      let visitHits = 0;
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
          HttpResponse.json(spaceBody({ canWrite: false })),
        ),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
        http.post(`*/api/v1/spaces/${SPACE_ID_RAW}/visits`, () => {
          visitHits += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const { Wrapper } = createQueryWrapper();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={false} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      expect(visitHits).toBe(0);
    });

    it("방문 기록 실패는 toast 없이 흡수된다 (silent — 상세 렌더 정상 진행)", async () => {
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () => HttpResponse.json(spaceBody())),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
        http.post(`*/api/v1/spaces/${SPACE_ID_RAW}/visits`, () =>
          HttpResponse.json({ code: "INTERNAL_ERROR", message: "방문 기록 실패" }, { status: 500 }),
        ),
      );

      const { Wrapper } = createQueryWrapper();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      // 상세는 그대로 렌더되고 toast 는 뜨지 않는다.
      expect(toastError).not.toHaveBeenCalled();
    });
  });

  describe("DropdownMenu — 스페이스 편집 액션 (canEdit gate)", () => {
    it("canEdit: true 면 '스페이스 편집' 항목이 노출되고 클릭 시 /edit 로 이동", async () => {
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
          HttpResponse.json(spaceBody({ canEdit: true })),
        ),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      );

      const { Wrapper } = createQueryWrapper();
      const user = userEvent.setup();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      await user.click(screen.getByRole("button", { name: "더보기" }));

      const editItem = await screen.findByRole("menuitem", { name: "스페이스 편집" });
      await user.click(editItem);

      expect(routerPush).toHaveBeenCalledWith(`/spaces/${SPACE_ID_RAW}/edit`);
    });

    it("canEdit: false 면 '스페이스 편집' 항목이 숨는다 — '스페이스 삭제' 는 유지 (기존 회귀 방지)", async () => {
      server.use(
        http.get(`*/api/v1/spaces/${SPACE_ID_RAW}`, () =>
          HttpResponse.json(spaceBody({ canEdit: false })),
        ),
        http.get("*/api/v1/pages", () => HttpResponse.json(pageListBody([]))),
      );

      const { Wrapper } = createQueryWrapper();
      const user = userEvent.setup();
      render(<SpaceDetailView spaceId={SPACE_ID} isAuthenticated={true} />, { wrapper: Wrapper });

      await screen.findByRole("heading", { name: "공개 위키" });
      await user.click(screen.getByRole("button", { name: "더보기" }));

      expect(await screen.findByRole("menuitem", { name: "스페이스 삭제" })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "스페이스 편집" })).not.toBeInTheDocument();
    });
  });
});
