import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { spaceKeys } from "@/lib/api/queries/space";
import { server } from "@/mocks/server";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper, createTestQueryClient } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

const { redirectToLoginMock } = vi.hoisted(() => ({ redirectToLoginMock: vi.fn() }));
vi.mock("@/lib/auth/redirect", () => redirectModuleMock({ redirectToLogin: redirectToLoginMock }));

import { useSpaceVisitRecord } from "./useSpaceVisitRecord";

describe("useSpaceVisitRecord", () => {
  beforeEach(() => {
    toastError.mockReset();
    redirectToLoginMock.mockReset();
  });

  it("성공 시 POST 를 발화하고 space list 만 invalidate 한다 (detail 은 무관)", async () => {
    let called = false;
    server.use(
      http.post("*/api/v1/spaces/s_1/visits", () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSpaceVisitRecord(), {
      wrapper: createQueryWrapper(client).Wrapper,
    });
    result.current.mutate(asSpaceId("s_1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(called).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: spaceKeys.lists() });
  });

  it("실패 시 toast 를 띄우지 않는다 (meta.silent — 사용자 흐름 무영향)", async () => {
    server.use(
      http.post("*/api/v1/spaces/s_1/visits", () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "일시적 오류가 발생했습니다." },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useSpaceVisitRecord(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    result.current.mutate(asSpaceId("s_1"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).not.toHaveBeenCalled();
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });

  it("401 INVALID_SESSION 은 silent 여도 여전히 redirect (세션 만료 회복 경로)", async () => {
    server.use(
      http.post("*/api/v1/spaces/s_1/visits", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useSpaceVisitRecord(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    result.current.mutate(asSpaceId("s_1"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });
});
