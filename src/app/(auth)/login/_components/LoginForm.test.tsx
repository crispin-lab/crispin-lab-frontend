import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

const { routerPush, searchParamsGet, toastError } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  searchParamsGet: vi.fn() as ReturnType<typeof vi.fn<(key: string) => string | null>>,
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

import { LoginForm } from "./LoginForm";

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const utils = render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
  return { ...utils, invalidateSpy };
}

function setRedirectQuery(value: string | null): void {
  searchParamsGet.mockImplementation((key: string) => (key === "redirect" ? value : null));
}

describe("LoginForm", () => {
  beforeEach(() => {
    routerPush.mockReset();
    searchParamsGet.mockReset();
    setRedirectQuery(null);
    toastError.mockReset();
  });

  it("정상 로그인 시 캐시를 invalidate 하고 / 로 push 한다", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    const { invalidateSpy } = renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("same-origin redirect query 는 그대로 사용", async () => {
    setRedirectQuery("/pages/abc");
    server.use(http.post("/api/auth/login", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/abc"));
  });

  it("외부 URL redirect 는 / 로 fallback (open redirect 방어)", async () => {
    setRedirectQuery("https://evil.com");
    server.use(http.post("/api/auth/login", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
  });

  it("protocol-relative redirect (//evil.com) 도 / 로 fallback", async () => {
    setRedirectQuery("//evil.com");
    server.use(http.post("/api/auth/login", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
  });

  it("401 INVALID_CREDENTIALS 응답 시 toast.error + redirect 안 함", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json(
          { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "wrong");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("이메일 또는 비밀번호가 올바르지 않습니다."),
    );
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("회원가입 link 는 기본적으로 /signup", () => {
    renderForm();
    const link = screen.getByRole("link", { name: /회원가입/ });
    expect(link).toHaveAttribute("href", "/signup");
  });

  it("redirect query 가 있으면 회원가입 link 도 query 를 carry 한다", () => {
    setRedirectQuery("/pages/abc");
    renderForm();
    const link = screen.getByRole("link", { name: /회원가입/ });
    expect(link).toHaveAttribute("href", `/signup?redirect=${encodeURIComponent("/pages/abc")}`);
  });
});
