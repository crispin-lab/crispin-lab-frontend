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

function stubSignupUpstream() {
  const upstream = vi.fn();
  server.use(
    http.post("/api/auth/signup", () => {
      upstream();
      return HttpResponse.json({ ok: true });
    }),
  );
  return upstream;
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
    const upstream = stubSignupUpstream();
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
    const upstream = stubSignupUpstream();
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
    const upstream = stubSignupUpstream();
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
    const upstream = stubSignupUpstream();
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

  it("409 HANDLE_DUPLICATED 응답 시 handle 필드 inline FormMessage + toast 동시 노출", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "HANDLE_DUPLICATED", message: "이미 등록된 사용자 이름입니다." },
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

    expect(await screen.findByText("이미 등록된 사용자 이름입니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("사용자 이름")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("이메일")).not.toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("이미 등록된 사용자 이름입니다."));
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("Object.prototype key 를 code 로 보내도 inline 분기로 떨어지지 않고 root fallback 으로 흡수", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "toString", message: "요청을 처리하지 못했습니다." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("요청을 처리하지 못했습니다.");
    expect(screen.getByLabelText("이메일")).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("사용자 이름")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("매핑되지 않은 409 code 는 root form error 로 fallback — toast + form-level alert 동시 노출, 필드 aria-invalid 없음", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "EMAIL_RESERVED", message: "예약된 이메일입니다." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "a@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("예약된 이메일입니다.");
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("예약된 이메일입니다."));
    expect(screen.getByLabelText("이메일")).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("사용자 이름")).not.toHaveAttribute("aria-invalid", "true");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("409 EMAIL_DUPLICATED 응답 시 email 필드 inline FormMessage + toast 동시 노출", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "EMAIL_DUPLICATED", message: "이미 등록된 이메일입니다." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("이메일"), "taken@b.com");
    await user.type(screen.getByLabelText("사용자 이름"), "alice");
    await user.type(screen.getByLabelText("비밀번호"), "password1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "password1");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByText("이미 등록된 이메일입니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("사용자 이름")).not.toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("이미 등록된 이메일입니다."));
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

  describe("비밀번호 정책", () => {
    async function fillAndSubmit(
      user: ReturnType<typeof userEvent.setup>,
      values: { email?: string; handle?: string; password: string; passwordConfirm?: string },
    ) {
      const { email = "a@b.com", handle = "alice", password } = values;
      const passwordConfirm = values.passwordConfirm ?? password;
      await user.type(screen.getByLabelText("이메일"), email);
      await user.type(screen.getByLabelText("사용자 이름"), handle);
      await user.type(screen.getByLabelText("비밀번호"), password);
      await user.type(screen.getByLabelText("비밀번호 확인"), passwordConfirm);
      await user.click(screen.getByRole("button", { name: "회원가입" }));
    }

    it("8자 미만은 길이 메시지 노출 + submit 막힘", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, { password: "abc123!" });

      expect(await screen.findByText("비밀번호는 8자 이상 입력해 주세요.")).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
      expect(routerPush).not.toHaveBeenCalled();
    });

    it("72자 초과는 길이 메시지 노출 + submit 막힘", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, { password: "a1".repeat(36) + "x" });

      expect(await screen.findByText("비밀번호는 72자를 넘을 수 없습니다.")).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("영문만 사용하면 variety 메시지 노출 + submit 막힘", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, { password: "abcdefghij" });

      expect(
        await screen.findByText("비밀번호에 영문/숫자/그 외 문자 중 두 종류 이상을 포함해 주세요."),
      ).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("숫자만 사용하면 variety 메시지 노출 + submit 막힘", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, { password: "12345678" });

      expect(
        await screen.findByText("비밀번호에 영문/숫자/그 외 문자 중 두 종류 이상을 포함해 주세요."),
      ).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("양 끝에 공백이 있으면 공백 메시지 노출 + submit 막힘", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, { password: "password1 " });

      expect(
        await screen.findByText("비밀번호 양 끝에는 공백을 사용할 수 없습니다."),
      ).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("이메일 local-part 가 비밀번호에 포함되면 식별자 메시지 노출", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, {
        email: "alice@example.com",
        handle: "carol_99",
        password: "alice1234",
      });

      expect(
        await screen.findByText("비밀번호에 이메일이나 사용자 이름을 포함할 수 없습니다."),
      ).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("사용자 이름이 비밀번호에 포함되면 식별자 메시지 노출", async () => {
      const upstream = stubSignupUpstream();
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, {
        email: "x@y.com",
        handle: "crispin",
        password: "crispin12",
      });

      expect(
        await screen.findByText("비밀번호에 이메일이나 사용자 이름을 포함할 수 없습니다."),
      ).toBeInTheDocument();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("3자 이하 식별자는 사전 검증에 걸리지 않고 mutation 까지 진행된다", async () => {
      // BE 의 MIN_SIMILARITY_LENGTH = 4 와 정합 — 짧은 식별자는 false positive 회피
      const requestBody = vi.fn<(body: unknown) => void>();
      server.use(
        http.post("/api/auth/signup", async ({ request }) => {
          requestBody(await request.json());
          return HttpResponse.json({ ok: true });
        }),
      );
      const user = userEvent.setup();
      renderForm();

      await fillAndSubmit(user, {
        email: "a@b.com",
        handle: "bob",
        password: "bob12345",
      });

      await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
      expect(requestBody).toHaveBeenCalledWith({
        email: "a@b.com",
        handle: "bob",
        password: "bob12345",
      });
    });
  });
});
