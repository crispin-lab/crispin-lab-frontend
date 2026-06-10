import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper } from "@/test/queryWrapper";

const { routerPush, urlSearchParams } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  urlSearchParams: { current: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => urlSearchParams.current,
}));

const { redirectToLoginMock, navigateAfterLogoutMock } = vi.hoisted(() => ({
  redirectToLoginMock: vi.fn(),
  navigateAfterLogoutMock: vi.fn(),
}));
vi.mock("@/lib/auth/redirect", () =>
  redirectModuleMock({
    redirectToLogin: redirectToLoginMock,
    navigateAfterLogout: navigateAfterLogoutMock,
  }),
);

import { AppHeader } from "./AppHeader";

function renderHeader() {
  const { Wrapper } = createQueryWrapper();
  return render(<AppHeader />, { wrapper: Wrapper });
}

function resetAllSpies() {
  routerPush.mockReset();
  redirectToLoginMock.mockReset();
  navigateAfterLogoutMock.mockReset();
  urlSearchParams.current = new URLSearchParams();
  window.history.replaceState({}, "", "/");
}

describe("AppHeader — 비로그인", () => {
  beforeEach(() => {
    resetAllSpies();
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );
  });

  it("로그인 link 가 /login 으로 노출된다", async () => {
    renderHeader();

    const loginLink = await screen.findByRole("link", { name: /로그인/ });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("계정 메뉴 trigger 는 노출되지 않는다", async () => {
    renderHeader();

    await screen.findByRole("link", { name: /로그인/ });
    expect(screen.queryByRole("button", { name: "계정 메뉴" })).not.toBeInTheDocument();
  });

  it("401 은 글로벌 redirect 를 트리거하지 않는다 (옵셔널 인증)", async () => {
    renderHeader();

    await screen.findByRole("link", { name: /로그인/ });
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });
});

describe("AppHeader — 로그인", () => {
  beforeEach(() => {
    resetAllSpies();
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({
          userId: "u_1",
          handle: "crispin",
          email: "crispin@example.com",
          role: "USER",
        }),
      ),
    );
  });

  it("@handle trigger 가 노출되고 로그인 link 는 사라진다", async () => {
    renderHeader();

    expect(await screen.findByRole("button", { name: "계정 메뉴" })).toHaveTextContent("@crispin");
    expect(screen.queryByRole("link", { name: /로그인/ })).not.toBeInTheDocument();
  });

  it("로그아웃 항목 클릭 시 BFF POST → 캐시 clear → navigateAfterLogout 호출", async () => {
    server.use(http.post("/api/auth/logout", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    renderHeader();

    await user.click(await screen.findByRole("button", { name: "계정 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "로그아웃" }));

    await waitFor(() => expect(navigateAfterLogoutMock).toHaveBeenCalledTimes(1));
  });

  it("로그아웃 BFF 가 5xx 여도 cleanup 은 동일하게 수행된다 (onSettled)", async () => {
    server.use(
      http.post("/api/auth/logout", () =>
        HttpResponse.json(
          { code: "BFF_UPSTREAM_UNAVAILABLE", message: "요청을 처리하지 못했습니다." },
          { status: 502 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderHeader();

    await user.click(await screen.findByRole("button", { name: "계정 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "로그아웃" }));

    await waitFor(() => expect(navigateAfterLogoutMock).toHaveBeenCalledTimes(1));
  });
});

describe("AppHeader — 5xx 일시 장애", () => {
  beforeEach(() => {
    resetAllSpies();
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
          { status: 500 },
        ),
      ),
    );
  });

  it("isError 로 settled 된 placeholder 만 보이고 로그인 link / 계정 메뉴 둘 다 노출되지 않는다", async () => {
    renderHeader();

    // settled 신호: placeholder 의 data-state 가 'loading' → 'error' 로 전이될 때까지 대기.
    // isPending 단계에서 가짜로 통과하지 않게 명시적 state 검증.
    await waitFor(() =>
      expect(screen.getByTestId("account-slot-placeholder")).toHaveAttribute("data-state", "error"),
    );

    expect(screen.queryByRole("link", { name: /로그인/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "계정 메뉴" })).not.toBeInTheDocument();
  });
});

describe("AppHeader — variant", () => {
  beforeEach(() => {
    resetAllSpies();
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );
  });

  it("variant='thin' 이면 검색 input 을 렌더하지 않는다", async () => {
    const { Wrapper } = createQueryWrapper();
    render(<AppHeader variant="thin" />, { wrapper: Wrapper });

    await screen.findByRole("link", { name: /로그인/ });
    expect(screen.queryByRole("searchbox", { name: "검색" })).not.toBeInTheDocument();
  });

  it("디폴트(variant 생략) 는 검색 input 을 렌더한다", async () => {
    const { Wrapper } = createQueryWrapper();
    render(<AppHeader />, { wrapper: Wrapper });

    await screen.findByRole("link", { name: /로그인/ });
    expect(screen.getByRole("searchbox", { name: "검색" })).toBeInTheDocument();
  });
});

describe("AppHeader — 검색 input", () => {
  beforeEach(() => {
    resetAllSpies();
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );
  });

  it("query 입력 후 submit 시 /search?query=... 로 push 한다", async () => {
    const user = userEvent.setup();
    renderHeader();

    const input = screen.getByRole("searchbox", { name: "검색" });
    await user.type(input, "위키 링크{Enter}");

    expect(routerPush).toHaveBeenCalledWith("/search?query=%EC%9C%84%ED%82%A4+%EB%A7%81%ED%81%AC");
  });

  it("빈 query 는 submit 해도 push 가 호출되지 않는다", async () => {
    const user = userEvent.setup();
    renderHeader();

    const input = screen.getByRole("searchbox", { name: "검색" });
    await user.type(input, "   {Enter}");

    expect(routerPush).not.toHaveBeenCalled();
  });

  it("URL 의 query 가 input 의 초기값으로 들어간다 (검색 페이지 재방문 시 검색어 보존)", async () => {
    urlSearchParams.current = new URLSearchParams({ query: "위키" });
    renderHeader();

    const input = await screen.findByRole<HTMLInputElement>("searchbox", { name: "검색" });
    expect(input.value).toBe("위키");
  });

  it("URL 의 sort/space 도 보존된 채 새 query 로 push 한다", async () => {
    // useSearchSubmit 은 callback 시점의 window.location.search 를 읽는다.
    window.history.replaceState({}, "", "/search?sort=RELEVANCE&space=s_1&page=3");
    const user = userEvent.setup();
    renderHeader();

    const input = screen.getByRole("searchbox", { name: "검색" });
    await user.type(input, "링크{Enter}");

    expect(routerPush).toHaveBeenCalledWith(
      "/search?query=%EB%A7%81%ED%81%AC&space=s_1&sort=RELEVANCE",
    );
  });
});
