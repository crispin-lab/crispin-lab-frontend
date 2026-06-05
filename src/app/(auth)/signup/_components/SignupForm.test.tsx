import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper } from "@/test/queryWrapper";

const { routerPush, searchParamsGet, toastError, redirectToLoginMock } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  searchParamsGet: vi.fn() as ReturnType<typeof vi.fn<(key: string) => string | null>>,
  toastError: vi.fn(),
  redirectToLoginMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

vi.mock("@/lib/auth/redirect", () => redirectModuleMock(redirectToLoginMock));

import { SignupForm } from "./SignupForm";

function renderForm() {
  const { Wrapper } = createQueryWrapper();
  return render(
    <Wrapper>
      <SignupForm />
    </Wrapper>,
  );
}

function setRedirectQuery(value: string | null): void {
  searchParamsGet.mockImplementation((key: string) => (key === "redirect" ? value : null));
}

describe("SignupForm", () => {
  beforeEach(() => {
    routerPush.mockReset();
    searchParamsGet.mockReset();
    setRedirectQuery(null);
    toastError.mockReset();
    redirectToLoginMock.mockReset();
  });

  it("잘못된 이메일은 FormMessage 를 노출하고 submit 이 막힌다", async () => {
    const upstream = vi.fn();
    server.use(
      http.post("/api/auth/signup", () => {
        upstream();
        return HttpResponse.json({ ok: true });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "not-an-email");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByText("올바른 이메일 형식이 아닙니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toHaveAttribute("aria-invalid", "true");
    expect(upstream).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("사용자 이름에 대문자가 들어가면 FormMessage 노출 + submit 막힘", async () => {
    const upstream = vi.fn();
    server.use(
      http.post("/api/auth/signup", () => {
        upstream();
        return HttpResponse.json({ ok: true });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "AliceX");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(
      await screen.findByText("사용자 이름은 영문 소문자·숫자·밑줄 3~30자입니다."),
    ).toBeInTheDocument();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("비밀번호 확인이 비어 있으면 FormMessage 노출 + submit 막힘", async () => {
    const upstream = vi.fn();
    server.use(
      http.post("/api/auth/signup", () => {
        upstream();
        return HttpResponse.json({ ok: true });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByText("비밀번호 확인을 입력해 주세요.")).toBeInTheDocument();
    expect(upstream).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("비밀번호와 비밀번호 확인이 다르면 FormMessage 노출 + submit 막힘", async () => {
    const upstream = vi.fn();
    server.use(
      http.post("/api/auth/signup", () => {
        upstream();
        return HttpResponse.json({ ok: true });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password2");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByText("비밀번호가 일치하지 않습니다.")).toBeInTheDocument();
    expect(upstream).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("정상 입력 시 mutation 호출 + / 로 push", async () => {
    const requestBody = vi.fn<(body: unknown) => void>();
    server.use(
      http.post("/api/auth/signup", async ({ request }) => {
        requestBody(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
    expect(requestBody).toHaveBeenCalledWith({
      email: "a@b.com",
      handle: "alice",
      password: "password1",
    });
  });

  it("same-origin redirect query 는 그대로 사용", async () => {
    setRedirectQuery("/pages/abc");
    server.use(http.post("/api/auth/signup", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/abc"));
  });

  it("외부 URL redirect 는 / 로 fallback (open redirect 방어)", async () => {
    setRedirectQuery("https://evil.com");
    server.use(http.post("/api/auth/signup", () => HttpResponse.json({ ok: true })));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
  });

  it("409 HANDLE_ALREADY_USED 응답 시 toast.error 호출 + redirect 안 함", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "HANDLE_ALREADY_USED", message: "이미 사용 중인 핸들입니다." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "taken");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("이미 사용 중인 사용자 이름입니다."),
    );
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("로그인 link 는 기본적으로 /login", () => {
    renderForm();
    const link = screen.getByRole("link", { name: /로그인/ });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("redirect query 가 있으면 로그인 link 도 query 를 carry 한다", () => {
    setRedirectQuery("/pages/abc");
    renderForm();
    const link = screen.getByRole("link", { name: /로그인/ });
    expect(link).toHaveAttribute("href", `/login?redirect=${encodeURIComponent("/pages/abc")}`);
  });
});
