import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { spaceAuditEntry, spaceAuditListBody } from "@/test/fixtures/spaceAudit";
import { createQueryWrapper } from "@/test/queryWrapper";

import { useSpaceAuditLog } from "./useSpaceAuditLog";

const SPACE_ID = asSpaceId("s_1");

describe("useSpaceAuditLog", () => {
  it("list 응답이 그대로 노출된다", async () => {
    server.use(
      http.get("*/api/v1/spaces/s_1/audit-entries", () =>
        HttpResponse.json(
          spaceAuditListBody([spaceAuditEntry({ id: "sae_1", actorHandle: "crispin" })]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceAuditLog(SPACE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].actorHandle).toBe("crispin");
  });

  it("page / size 파라미터가 query string 으로 전달된다", async () => {
    let capturedPage: string | null = null;
    let capturedSize: string | null = null;
    server.use(
      http.get("*/api/v1/spaces/s_1/audit-entries", ({ request }) => {
        const url = new URL(request.url);
        capturedPage = url.searchParams.get("page");
        capturedSize = url.searchParams.get("size");
        return HttpResponse.json(spaceAuditListBody([]));
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceAuditLog(SPACE_ID, { page: 2, size: 50 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedPage).toBe("2");
    expect(capturedSize).toBe("50");
  });

  it("403 은 ApiError.code 로 그대로 전달된다 — 권한 부재 (SSR 이 이미 gate 하지만 refetch 안전망)", async () => {
    server.use(
      http.get("*/api/v1/spaces/s_1/audit-entries", () =>
        HttpResponse.json(
          { code: "SPACE_NOT_ACCESSIBLE", message: "접근할 수 없는 스페이스입니다." },
          { status: 403 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceAuditLog(SPACE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("SPACE_NOT_ACCESSIBLE");
  });
});
