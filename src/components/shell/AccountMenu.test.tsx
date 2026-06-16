import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper } from "@/test/queryWrapper";

const { setThemeMock, themeRef } = vi.hoisted(() => ({
  setThemeMock: vi.fn(),
  themeRef: { resolvedTheme: "dark" as "dark" | "light" | undefined },
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: themeRef.resolvedTheme,
    setTheme: setThemeMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth/redirect", () => redirectModuleMock({ navigateAfterLogout: vi.fn() }));

import { AccountMenu } from "./AccountMenu";

const me = { userId: "u_1", handle: "crispin", email: "crispin@example.com", role: "USER" as const };

function renderMenu() {
  const { Wrapper } = createQueryWrapper();
  return render(<AccountMenu me={me} />, { wrapper: Wrapper });
}

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "계정 메뉴" }));
  return user;
}

beforeEach(() => {
  setThemeMock.mockReset();
  themeRef.resolvedTheme = "dark";
});

describe("AccountMenu — 테마 토글", () => {
  it("dark 상태에서는 '라이트 모드' 항목이 노출되고 클릭 시 setTheme('light') 호출", async () => {
    themeRef.resolvedTheme = "dark";
    renderMenu();
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitem", { name: "라이트 모드" }));

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  it("light 상태에서는 '다크 모드' 항목이 노출되고 클릭 시 setTheme('dark') 호출", async () => {
    themeRef.resolvedTheme = "light";
    renderMenu();
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitem", { name: "다크 모드" }));

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("resolvedTheme 가 undefined (mount 전) 면 dark 로 가정 — '라이트 모드' 항목 노출", async () => {
    themeRef.resolvedTheme = undefined;
    renderMenu();
    await openMenu();

    expect(await screen.findByRole("menuitem", { name: "라이트 모드" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "다크 모드" })).not.toBeInTheDocument();
  });
});

describe("AccountMenu — 기존 항목 회귀", () => {
  beforeEach(() => {
    server.use(http.post("/api/auth/logout", () => HttpResponse.json({ ok: true })));
  });

  it("스페이스 link 와 로그아웃 항목이 그대로 노출된다", async () => {
    renderMenu();
    await openMenu();

    const spaces = await screen.findByRole("menuitem", { name: "스페이스" });
    expect(spaces).toHaveAttribute("href", "/spaces");
    expect(screen.getByRole("menuitem", { name: "로그아웃" })).toBeInTheDocument();
  });
});
