import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

import { useLogin, useSignup } from "./useAuth";

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function createClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
}

describe("useLogin", () => {
  beforeEach(() => {
    toastError.mockReset();
  });

  it("성공 시 queryClient.invalidateQueries 가 호출되고 onError 는 호출되지 않는다", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.json({ ok: true })));
    const client = createClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useLogin(), { wrapper: withClient(client) });
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

    const { result } = renderHook(() => useLogin(), { wrapper: withClient(createClient()) });
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

    const { result } = renderHook(() => useLogin(), { wrapper: withClient(createClient()) });
    result.current.mutate({ email: "a@b.com", password: "pw" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("useSignup", () => {
  beforeEach(() => {
    toastError.mockReset();
  });

  it("성공 시 queryClient.invalidateQueries 가 호출되고 onError 는 호출되지 않는다", async () => {
    server.use(http.post("/api/auth/signup", () => HttpResponse.json({ ok: true })));
    const client = createClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSignup(), { wrapper: withClient(client) });
    result.current.mutate({ email: "a@b.com", handle: "alice", password: "password1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("4xx 응답 시 toast.error 가 백엔드 message 로 호출된다", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          { code: "HANDLE_ALREADY_USED", message: "이미 사용 중인 핸들입니다." },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useSignup(), { wrapper: withClient(createClient()) });
    result.current.mutate({ email: "a@b.com", handle: "taken", password: "password1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith("이미 사용 중인 사용자 이름입니다.");
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

    const { result } = renderHook(() => useSignup(), { wrapper: withClient(createClient()) });
    result.current.mutate({ email: "a@b.com", handle: "alice", password: "password1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).not.toHaveBeenCalled();
  });
});
