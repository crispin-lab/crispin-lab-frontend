import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { asPageId, asSpaceId } from "@/lib/api/ids";
import { pageKeys } from "@/lib/api/queries/page";
import { server } from "@/mocks/server";
import { pageBody } from "@/test/fixtures/page";
import { createQueryWrapper } from "@/test/queryWrapper";

import type { PageSearchResult, PageSummary } from "@/lib/api/types";

import {
  usePage,
  usePageCreate,
  usePageDelete,
  usePageList,
  usePageMove,
  usePageReorder,
  usePageEdit,
} from "./usePage";

function pageSummary(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    spaceId: "s_1",
    title: "이전",
    pageId: "p_1",
    updatedAt: "2026-01-01T00:00:00Z",
    displayOrder: 0,
    authorHandle: "u_1",
    authorId: "u_1",
    visibility: "PUBLIC",
    ...overrides,
  };
}

function listBody(items: PageSummary[]): PageSearchResult {
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

describe("usePage", () => {
  it("happy: detail 을 fetch 해 data 로 노출한다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePage(asPageId("p_1")), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("원본 제목");
  });
});

describe("usePageList", () => {
  it("empty 응답이 그대로 data.items 로 노출된다 (호출처가 빈 상태 분기를 짤 수 있음)", async () => {
    server.use(http.get("*/api/v1/pages", () => HttpResponse.json(listBody([]))));

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePageList({ spaceId: asSpaceId("s_empty") }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
    expect(result.current.data?.isEmpty).toBe(true);
  });
});

describe("usePageEdit", () => {
  it("성공 시 해당 detail 과 모든 list 가 refetch 되어 새 값으로 갱신된다", async () => {
    const initialBody = pageBody({ title: "이전" });
    const updatedBody = pageBody({ title: "이후" });
    const initialList = listBody([pageSummary({ title: "이전" })]);
    const updatedList = listBody([
      pageSummary({ title: "이후", updatedAt: "2026-02-01T00:00:00Z" }),
    ]);

    let detailHits = 0;
    let listHits = 0;
    server.use(
      http.get("*/api/v1/pages/p_1", () => {
        detailHits += 1;
        return HttpResponse.json(detailHits === 1 ? initialBody : updatedBody);
      }),
      http.get("*/api/v1/pages", () => {
        listHits += 1;
        return HttpResponse.json(listHits === 1 ? initialList : updatedList);
      }),
      http.put("*/api/v1/pages/p_1", () =>
        HttpResponse.json({
          title: "이후",
          pageId: "p_1",
          version: 2,
          updatedAt: "2026-02-01T00:00:00Z",
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        list: usePageList({ spaceId: asSpaceId("s_1") }),
        edit: usePageEdit(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.detail.data?.title).toBe("이전");

    result.current.edit.mutate({
      pageId: asPageId("p_1"),
      body: { title: "이후", content: "본문" },
    });

    await waitFor(() => expect(result.current.edit.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.detail.data?.title).toBe("이후"));
    await waitFor(() => expect(result.current.list.data?.items[0]?.title).toBe("이후"));
    expect(detailHits).toBe(2);
    expect(listHits).toBe(2);
  });

  it("실패 시 cache 가 변경되지 않고 error 가 ApiError 로 전달된다", async () => {
    const initialBody = pageBody({ title: "원본" });

    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(initialBody)),
      http.put("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          { code: "PAGE_LOCKED", message: "수정 중인 페이지입니다." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        edit: usePageEdit(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    result.current.edit.mutate({
      pageId: asPageId("p_1"),
      body: { title: "충돌", content: "x" },
    });

    await waitFor(() => expect(result.current.edit.isError).toBe(true));
    expect(result.current.edit.error).toBeInstanceOf(ApiError);
    expect(result.current.edit.error?.code).toBe("PAGE_LOCKED");
    expect(result.current.detail.data?.title).toBe("원본");
  });
});

describe("usePageCreate", () => {
  it("성공 시 list 만 refetch, 무관한 detail cache 는 그대로다", async () => {
    const otherDetail = pageBody({ pageId: "p_other", title: "다른 페이지" });

    let listHits = 0;
    let otherDetailHits = 0;
    server.use(
      http.get("*/api/v1/pages/p_other", () => {
        otherDetailHits += 1;
        return HttpResponse.json(otherDetail);
      }),
      http.get("*/api/v1/pages", () => {
        listHits += 1;
        return HttpResponse.json(listBody([]));
      }),
      http.post("*/api/v1/pages", () => HttpResponse.json({ pageId: "p_new" }, { status: 201 })),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        otherDetail: usePage(asPageId("p_other")),
        list: usePageList({ spaceId: asSpaceId("s_1") }),
        create: usePageCreate(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.otherDetail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(listHits).toBe(1);
    expect(otherDetailHits).toBe(1);

    result.current.create.mutate({
      spaceId: "s_1",
      visibility: "PUBLIC",
      title: "새 글",
      content: "본문",
    });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    await waitFor(() => expect(listHits).toBe(2));

    expect(otherDetailHits).toBe(1);
    expect(result.current.otherDetail.data?.title).toBe("다른 페이지");
  });
});

describe("usePageDelete", () => {
  it("성공 시 list 는 refetch 되고 detail 은 stale 표시만 (active observer 의 refetch → 404 race 방지)", async () => {
    let detailHits = 0;
    let listHits = 0;
    let deleted = false;
    server.use(
      http.get("*/api/v1/pages/p_1", () => {
        detailHits += 1;
        return HttpResponse.json(pageBody());
      }),
      http.get("*/api/v1/pages", () => {
        listHits += 1;
        return HttpResponse.json(listBody([pageSummary()]));
      }),
      http.delete("*/api/v1/pages/p_1", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper, client } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        list: usePageList({ spaceId: asSpaceId("s_1") }),
        delete: usePageDelete(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(detailHits).toBe(1);
    expect(listHits).toBe(1);

    result.current.delete.mutate(asPageId("p_1"));

    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(listHits).toBe(2));
    expect(detailHits).toBe(1);
    const detailState = client.getQueryState(pageKeys.detail(asPageId("p_1")));
    expect(detailState?.isInvalidated).toBe(true);
  });

  it("실패 시 ApiError 가 error 로 노출되고 cache 는 그대로다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.delete("*/api/v1/pages/p_1", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "삭제 권한이 없습니다." }, { status: 403 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        delete: usePageDelete(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    result.current.delete.mutate(asPageId("p_1"));

    await waitFor(() => expect(result.current.delete.isError).toBe(true));
    expect(result.current.delete.error).toBeInstanceOf(ApiError);
    expect(result.current.delete.error?.code).toBe("FORBIDDEN");
    expect(result.current.delete.error?.message).toBe("삭제 권한이 없습니다.");
    expect(result.current.detail.data?.title).toBe("원본 제목");
  });
});

describe("usePageMove", () => {
  it("성공 시 detail 과 모든 list 가 refetch 되어 새 부모 값으로 갱신된다", async () => {
    const initialBody = pageBody({ parentPageId: null });
    const updatedBody = pageBody({ parentPageId: "p_parent" });

    let detailHits = 0;
    let listHits = 0;
    server.use(
      http.get("*/api/v1/pages/p_1", () => {
        detailHits += 1;
        return HttpResponse.json(detailHits === 1 ? initialBody : updatedBody);
      }),
      http.get("*/api/v1/pages", () => {
        listHits += 1;
        return HttpResponse.json(listBody([pageSummary()]));
      }),
      http.put("*/api/v1/pages/p_1/parent", () => new HttpResponse(null, { status: 204 })),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        list: usePageList({ spaceId: asSpaceId("s_1") }),
        move: usePageMove(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.detail.data?.parentPageId).toBeNull();

    result.current.move.mutate({
      pageId: asPageId("p_1"),
      body: { parentPageId: "p_parent" },
    });

    await waitFor(() => expect(result.current.move.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.detail.data?.parentPageId).toBe("p_parent"));
    expect(detailHits).toBe(2);
    expect(listHits).toBe(2);
  });

  it("PAGE_PARENT_CYCLE 은 ApiError.code 로 전달돼 호출부가 분기 가능하다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/p_1/parent", () =>
        HttpResponse.json(
          {
            code: "PAGE_PARENT_CYCLE",
            message: "자기 자신 또는 자손 페이지를 부모로 설정할 수 없습니다.",
          },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        move: usePageMove(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    result.current.move.mutate({
      pageId: asPageId("p_1"),
      body: { parentPageId: "p_descendant" },
    });

    await waitFor(() => expect(result.current.move.isError).toBe(true));
    expect(result.current.move.error).toBeInstanceOf(ApiError);
    expect(result.current.move.error?.code).toBe("PAGE_PARENT_CYCLE");
  });
});

describe("usePageReorder", () => {
  it("성공 시 detail 과 형제 list 가 refetch 되어 새 순서로 갱신된다", async () => {
    const initialBody = pageBody({ displayOrder: 2 });
    const updatedBody = pageBody({ displayOrder: 0 });

    let detailHits = 0;
    let listHits = 0;
    server.use(
      http.get("*/api/v1/pages/p_1", () => {
        detailHits += 1;
        return HttpResponse.json(detailHits === 1 ? initialBody : updatedBody);
      }),
      http.get("*/api/v1/pages", () => {
        listHits += 1;
        return HttpResponse.json(listBody([pageSummary({ displayOrder: 0 })]));
      }),
      http.put("*/api/v1/pages/p_1/order", () => new HttpResponse(null, { status: 204 })),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        detail: usePage(asPageId("p_1")),
        list: usePageList({ spaceId: asSpaceId("s_1") }),
        reorder: usePageReorder(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.detail.data?.displayOrder).toBe(2);

    result.current.reorder.mutate({
      pageId: asPageId("p_1"),
      body: { displayOrder: 0 },
    });

    await waitFor(() => expect(result.current.reorder.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.detail.data?.displayOrder).toBe(0));
    expect(detailHits).toBe(2);
    expect(listHits).toBe(2);
  });
});
