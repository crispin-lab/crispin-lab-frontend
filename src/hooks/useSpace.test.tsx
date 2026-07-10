import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { asSpaceId } from "@/lib/api/ids";
import { spaceKeys } from "@/lib/api/queries/space";
import { server } from "@/mocks/server";
import { spaceBody } from "@/test/fixtures/space";
import { createQueryWrapper } from "@/test/queryWrapper";

import type { SpaceListResult, SpaceSummary } from "@/lib/api/types";

import { usePageList } from "./usePage";
import {
  useSpaceCreate,
  useSpaceDelete,
  useSpaceDetail,
  useSpaceEdit,
  useSpaceList,
} from "./useSpace";

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

describe("useSpaceDetail", () => {
  it("주어진 spaceId 의 상세를 그대로 노출한다", async () => {
    const body = spaceBody({ name: "공개 위키", description: "설명" });
    server.use(http.get("*/api/v1/spaces/s_1", () => HttpResponse.json(body)));

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceDetail(asSpaceId("s_1")), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
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

describe("useSpaceDelete", () => {
  it("성공 시 list 들은 refetch 되고 스페이스 detail 은 stale 표시만 (active observer 의 refetch → 404 race 방지)", async () => {
    const detailBody = spaceBody({ name: "삭제 대상", description: "설명" });
    let spaceDetailHits = 0;
    let spaceListHits = 0;
    let pageListHits = 0;
    let deleted = false;
    server.use(
      http.get("*/api/v1/spaces/s_1", () => {
        spaceDetailHits += 1;
        return HttpResponse.json(detailBody);
      }),
      http.get("*/api/v1/spaces", () => {
        spaceListHits += 1;
        return HttpResponse.json(listBody([]));
      }),
      http.get("*/api/v1/pages", () => {
        pageListHits += 1;
        return HttpResponse.json({
          size: 20,
          isEmpty: true,
          totalPages: 0,
          hasNext: false,
          page: 0,
          items: [],
          totalElements: 0,
        });
      }),
      http.delete("*/api/v1/spaces/s_1", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper, client } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: useSpaceDetail(asSpaceId("s_1")),
        list: useSpaceList(),
        pageList: usePageList({ spaceId: asSpaceId("s_1") }),
        delete: useSpaceDelete(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.pageList.isSuccess).toBe(true));
    expect(spaceDetailHits).toBe(1);
    expect(spaceListHits).toBe(1);
    expect(pageListHits).toBe(1);

    result.current.delete.mutate(asSpaceId("s_1"));

    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(spaceListHits).toBe(2));
    await waitFor(() => expect(pageListHits).toBe(2));
    expect(spaceDetailHits).toBe(1);
    const detailState = client.getQueryState(spaceKeys.detail(asSpaceId("s_1")));
    expect(detailState?.isInvalidated).toBe(true);
  });

  it("실패 시 ApiError 가 error 로 전달된다", async () => {
    server.use(
      http.delete("*/api/v1/spaces/s_1", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "삭제 권한이 없습니다." }, { status: 403 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceDelete(), { wrapper: Wrapper });

    result.current.mutate(asSpaceId("s_1"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("FORBIDDEN");
    expect(result.current.error?.message).toBe("삭제 권한이 없습니다.");
  });
});

describe("useSpaceEdit", () => {
  const editedResponse = {
    spaceId: "s_1",
    name: "새 이름",
    description: "새 설명",
    visibility: "INTERNAL",
    updatedAt: "2026-07-01T00:00:00Z",
  };

  it("성공 시 detail + lists 가 refetch 된다 (invalidate 검증)", async () => {
    const spaceBodyResp = spaceBody({
      name: "원래 이름",
      description: "원래 설명",
      canEdit: true,
    });
    let detailHits = 0;
    let listHits = 0;
    let putBody: unknown = null;
    server.use(
      http.get("*/api/v1/spaces/s_1", () => {
        detailHits += 1;
        return HttpResponse.json(spaceBodyResp);
      }),
      http.get("*/api/v1/spaces", () => {
        listHits += 1;
        return HttpResponse.json(listBody([]));
      }),
      http.put("*/api/v1/spaces/s_1", async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json(editedResponse);
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: useSpaceDetail(asSpaceId("s_1")),
        list: useSpaceList(),
        edit: useSpaceEdit(asSpaceId("s_1")),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(detailHits).toBe(1);
    expect(listHits).toBe(1);

    result.current.edit.mutate({ name: "새 이름" });

    await waitFor(() => expect(result.current.edit.isSuccess).toBe(true));
    expect(putBody).toEqual({ name: "새 이름" });
    await waitFor(() => expect(detailHits).toBe(2));
    await waitFor(() => expect(listHits).toBe(2));
  });

  it("실패 시 ApiError 가 error 로 전달된다", async () => {
    server.use(
      http.put("*/api/v1/spaces/s_1", () =>
        HttpResponse.json(
          {
            code: "SPACE_EDIT_REQUEST_INVALID",
            message: "수정할 필드를 최소 1개 이상 입력해 주세요.",
          },
          { status: 400 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceEdit(asSpaceId("s_1")), { wrapper: Wrapper });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("SPACE_EDIT_REQUEST_INVALID");
  });
});
