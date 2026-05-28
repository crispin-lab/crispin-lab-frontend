import { useMutation, useQuery } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

import { Providers } from "./providers";

const redirectToLogin = vi.fn();
vi.mock("@/lib/auth/redirect", () => ({
  redirectToLogin: () => redirectToLogin(),
}));

function QueryProbe({ error }: { error: unknown }) {
  const { isError } = useQuery({
    queryKey: ["probe", String(error instanceof Error ? error.message : error)],
    queryFn: () => Promise.reject(error),
    retry: false,
  });
  return <output>{isError ? "error" : "pending"}</output>;
}

function MutationProbe({ error }: { error: unknown }) {
  const { mutate, isError } = useMutation({
    mutationFn: () => Promise.reject(error),
  });
  return (
    <div>
      <button onClick={() => mutate()} type="button">
        fire
      </button>
      <output>{isError ? "error" : "pending"}</output>
    </div>
  );
}

describe("Providers — 401 글로벌 처리", () => {
  beforeEach(() => {
    redirectToLogin.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("query 가 ApiError(401, INVALID_SESSION) 으로 실패하면 redirectToLogin 호출", async () => {
    const error = new ApiError(401, "INVALID_SESSION", "세션이 만료되었습니다.");
    render(
      <Providers>
        <QueryProbe error={error} />
      </Providers>,
    );

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledTimes(1);
    });
  });

  it("query 가 ApiError(404, PAGE_NOT_FOUND) 으로 실패해도 redirect 하지 않는다", async () => {
    const error = new ApiError(404, "PAGE_NOT_FOUND", "페이지를 찾을 수 없습니다.");
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={error} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(redirectToLogin).not.toHaveBeenCalled();
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

  it("non-ApiError (예: TypeError) 에서는 redirect 하지 않는다", async () => {
    const { getByRole } = render(
      <Providers>
        <QueryProbe error={new TypeError("network")} />
      </Providers>,
    );

    await waitFor(() => expect(getByRole("status").textContent).toBe("error"));
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("mutation 이 ApiError(401, INVALID_SESSION) 으로 실패해도 redirectToLogin 호출", async () => {
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
  });
});
