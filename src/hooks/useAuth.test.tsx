import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper, createTestQueryClient } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

const { redirectToLoginMock } = vi.hoisted(() => ({
  redirectToLoginMock: vi.fn(),
}));
vi.mock("@/lib/auth/redirect", () =>
  redirectModuleMock({
    redirectToLogin: redirectToLoginMock,
  }),
);

const { routerRefreshMock } = vi.hoisted(() => ({ routerRefreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

import { useLogin, useLogout, useMe, useSignup } from "./useAuth";

describe("useLogin", () => {
  beforeEach(() => {
    toastError.mockReset();
    redirectToLoginMock.mockReset();
  });

  it("성공 시 queryClient.invalidateQueries 가 호출되고 onError 는 호출되지 않는다", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.json({ ok: true })));
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useLogin(), {
      wrapper: createQueryWrapper(client).Wrapper,
    });
    result.current.mutate({ email: "a@b.com", password: "pw" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("INVALID_CREDENTIALS 응답 시 toast.error 가 백엔드 message 로 호출된다", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json(
          { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createQueryWrapper().Wrapper });
    result.current.mutate({ email: "a@b.com", password: "wrong" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith("이메일 또는 비밀번호가 올바르지 않습니다.");
  });

  it("INVALID_SESSION (401) 은 글로벌 가드가 redirect 로 처리하므로 toast 는 띄우지 않는다", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createQueryWrapper().Wrapper });
    result.current.mutate({ email: "a@b.com", password: "pw" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("useSignup", () => {
  beforeEach(() => {
    toastError.mockReset();
    redirectToLoginMock.mockReset();
  });

  it("성공 시 queryClient.invalidateQueries 가 호출되고 onError 는 호출되지 않는다", async () => {
    server.use(http.post("/api/auth/signup", () => HttpResponse.json({ ok: true })));
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSignup(), {
      wrapper: createQueryWrapper(client).Wrapper,
    });
    result.current.mutate({ email: "a@b.com", handle: "alice", password: "password1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("4xx 응답 시 toast.error 가 백엔드 message 로 호출된다", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "HANDLE_ALREADY_USED", message: "이미 등록된 사용자 이름입니다." },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useSignup(), { wrapper: createQueryWrapper().Wrapper });
    result.current.mutate({ email: "a@b.com", handle: "taken", password: "password1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith("이미 등록된 사용자 이름입니다.");
  });

  it("INVALID_SESSION (401) 은 글로벌 가드가 redirect 로 처리하므로 toast 는 띄우지 않는다", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useSignup(), { wrapper: createQueryWrapper().Wrapper });
    result.current.mutate({ email: "a@b.com", handle: "alice", password: "password1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("useMe", () => {
  beforeEach(() => {
    toastError.mockReset();
    redirectToLoginMock.mockReset();
  });

  it("200 응답이면 응답 본문을 그대로 반환한다", async () => {
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

    const { result } = renderHook(() => useMe(), { wrapper: createQueryWrapper().Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      userId: "u_1",
      handle: "crispin",
      email: "crispin@example.com",
      role: "USER",
    });
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });

  it("401 INVALID_SESSION 은 null 로 흡수되고 글로벌 redirect 가 걸리지 않는다", async () => {
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useMe(), { wrapper: createQueryWrapper().Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });

  it("5xx 는 error 로 노출된다 (옵셔널 인증 흡수는 401 에만 한정)", async () => {
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useMe(), { wrapper: createQueryWrapper().Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useLogout", () => {
  beforeEach(() => {
    toastError.mockReset();
    redirectToLoginMock.mockReset();
    routerRefreshMock.mockReset();
  });

  it("성공 시 캐시를 clear 하고 router.refresh 로 anonymous RSC 재진입을 트리거한다", async () => {
    server.use(http.post("/api/auth/logout", () => HttpResponse.json({ ok: true })));
    const client = createTestQueryClient();
    const clearSpy = vi.spyOn(client, "clear");

    const { result } = renderHook(() => useLogout(), {
      wrapper: createQueryWrapper(client).Wrapper,
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("BFF 가 5xx 여도 onSettled 로 cleanup 이 동일하게 수행된다 (사용자가 의도대로 떠날 수 있어야 함)", async () => {
    server.use(
      http.post("/api/auth/logout", () =>
        HttpResponse.json(
          { code: "BFF_UPSTREAM_UNAVAILABLE", message: "요청을 처리하지 못했습니다." },
          { status: 502 },
        ),
      ),
    );
    const client = createTestQueryClient();
    const clearSpy = vi.spyOn(client, "clear");

    const { result } = renderHook(() => useLogout(), {
      wrapper: createQueryWrapper(client).Wrapper,
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });
});
