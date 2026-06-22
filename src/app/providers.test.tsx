import { useMutation, useQuery } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useId } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { redirectModuleMock } from "@/test/mocks/redirect";

import { Providers } from "./providers";

const { redirectToLogin, toastError } = vi.hoisted(() => ({
  redirectToLogin: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/lib/auth/redirect", () => redirectModuleMock(redirectToLogin));
vi.mock("sonner", () => ({
  toast: { error: toastError },
  Toaster: () => null,
}));

function QueryProbe({ error }: { error: unknown }) {
  const probeId = useId();
  const { isError } = useQuery({
    queryKey: ["probe", probeId],
    queryFn: () => Promise.reject(error),
    retry: false,
  });
  return <output>{isError ? "error" : "pending"}</output>;
}

function MutationProbe({ error, label = "fire" }: { error: unknown; label?: string }) {
  const { mutate, isError } = useMutation({
    mutationFn: () => Promise.reject(error),
  });
  return (
    <div>
      <button onClick={() => mutate()} type="button">
        {label}
      </button>
      <output>{isError ? "error" : "pending"}</output>
    </div>
  );
}

describe("Providers — 글로벌 에러 처리", () => {
  beforeEach(() => {
    redirectToLogin.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("query 가 ApiError(401, INVALID_SESSION) 으로 실패해도 redirect 하지 않는다 — inline UI 가 흡수", async () => {
    // PUBLIC 페이지 reading 중 auth-only 서브 쿼리 (예: 페이지 태그) 가 401 을 받아도 본문 reading 흐름을 끊지 않게.
    // auth 가 필요한 라우트 자체는 SSR (apiFetchServer / cookies() 체크) 에서 redirect — mutation 은 별도 redirect 정책.
    const error = new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다.");
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={error} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(redirectToLogin).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("query 가 ApiError(404, PAGE_NOT_FOUND) 으로 실패해도 redirect/toast 둘 다 호출하지 않는다 (컴포넌트별 처리)", async () => {
    const error = new ApiError(404, "PAGE_NOT_FOUND", "페이지를 찾을 수 없습니다.");
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={error} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(redirectToLogin).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("query 가 ApiError(401, OTHER_CODE) 으로 실패해도 redirect 하지 않는다 (code 가 다름)", async () => {
    const error = new ApiError(401, "RATE_LIMITED", "잠시 후 다시 시도해 주세요.");
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={error} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("query 는 toast 를 띄우지 않는다 — UI 가 isError 로 표현", async () => {
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={error} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("non-ApiError (예: TypeError) 에서는 redirect 하지 않는다", async () => {
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={new TypeError("network")} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("mutation 이 ApiError(401, INVALID_SESSION) 으로 실패하면 redirectToLogin 호출 + toast 안 띄움", async () => {
    const error = new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다.");
    const user = userEvent.setup();
    const { getByRole } = render(
      <Providers>
        <MutationProbe error={error} />
      </Providers>,
    );

    await user.click(getByRole("button", { name: "fire" }));

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledTimes(1);
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("mutation 이 ApiError(403) 으로 실패하면 백엔드 message 로 toast", async () => {
    const error = new ApiError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
    const user = userEvent.setup();
    const { getByRole } = render(
      <Providers>
        <MutationProbe error={error} />
      </Providers>,
    );

    await user.click(getByRole("button", { name: "fire" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("이 작업을 수행할 권한이 없습니다."),
    );
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("mutation 이 ApiError(404) 으로 실패해도 toast — mutation 은 inline UI 가 없어 사용자 피드백 필요", async () => {
    const error = new ApiError(404, "SPACE_NOT_FOUND", "스페이스를 찾을 수 없습니다.");
    const user = userEvent.setup();
    const { getByRole } = render(
      <Providers>
        <MutationProbe error={error} />
      </Providers>,
    );

    await user.click(getByRole("button", { name: "fire" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("스페이스를 찾을 수 없습니다."));
  });

  it("mutation 이 ApiError(500) 으로 실패하면 toast", async () => {
    const error = new ApiError(500, "INTERNAL", "서버 오류입니다.");
    const user = userEvent.setup();
    const { getByRole } = render(
      <Providers>
        <MutationProbe error={error} />
      </Providers>,
    );

    await user.click(getByRole("button", { name: "fire" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("서버 오류입니다."));
  });

  // 실제 navigation 이 1회로 묶이는 회귀는 redirect.test.ts 의 "두 번째 호출은 무시한다" 가 보장.
  it("동시 다발 401 mutation 은 각 실패마다 redirectToLogin 을 호출", async () => {
    const error = new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다.");
    const user = userEvent.setup();
    const { getByRole } = render(
      <Providers>
        <MutationProbe error={error} label="fire-a" />
        <MutationProbe error={error} label="fire-b" />
        <MutationProbe error={error} label="fire-c" />
      </Providers>,
    );

    await user.click(getByRole("button", { name: "fire-a" }));
    await user.click(getByRole("button", { name: "fire-b" }));
    await user.click(getByRole("button", { name: "fire-c" }));

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledTimes(3);
    });
  });
});
