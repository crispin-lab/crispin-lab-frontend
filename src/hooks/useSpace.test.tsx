import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import type { SpaceListResult, SpaceSummary } from "@/lib/api/types";

import { useSpaceCreate, useSpaceList } from "./useSpace";

function listBody(items: SpaceSummary[]): SpaceListResult {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
  };
}

describe("useSpaceList", () => {
  it("empty 응답이 그대로 data.items 로 노출된다 (호출처가 빈 상태 분기를 짤 수 있음)", async () => {
    server.use(http.get("*/api/v1/spaces", () => HttpResponse.json(listBody([]))));

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceList(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
    expect(result.current.data?.isEmpty).toBe(true);
  });
});

describe("useSpaceCreate", () => {
  it("성공 시 모든 list (다른 params 포함) 가 refetch 된다 — lists() 상위 key 일괄 invalidate", async () => {
    let firstListHits = 0;
    let secondListHits = 0;
    server.use(
      http.get("*/api/v1/spaces", ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        if (page === "1") {
          secondListHits += 1;
        } else {
          firstListHits += 1;
        }
        return HttpResponse.json(listBody([]));
      }),
      http.post("*/api/v1/spaces", () => HttpResponse.json({ spaceId: "s_new" }, { status: 201 })),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        first: useSpaceList({ page: 0, size: 20 }),
        second: useSpaceList({ page: 1, size: 20 }),
        create: useSpaceCreate(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.first.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.second.isSuccess).toBe(true));
    expect(firstListHits).toBe(1);
    expect(secondListHits).toBe(1);

    result.current.create.mutate({
      name: "새 스페이스",
      description: "설명",
      visibility: "INTERNAL",
    });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    await waitFor(() => expect(firstListHits).toBe(2));
    await waitFor(() => expect(secondListHits).toBe(2));
  });

  it("실패 시 error 가 ApiError 로 전달된다", async () => {
    server.use(
      http.post("*/api/v1/spaces", () =>
        HttpResponse.json(
          { code: "SPACE_NAME_DUPLICATED", message: "이미 같은 이름의 스페이스가 있습니다." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceCreate(), { wrapper: Wrapper });

    result.current.mutate({
      name: "중복",
      description: "설명",
      visibility: "INTERNAL",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("SPACE_NAME_DUPLICATED");
  });
});
