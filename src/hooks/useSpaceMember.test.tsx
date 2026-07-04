import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { asSpaceId, asUserId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { spaceMemberListBody, spaceMemberSummary } from "@/test/fixtures/spaceMember";
import { createQueryWrapper } from "@/test/queryWrapper";

import {
  useSpaceMemberInvite,
  useSpaceMemberList,
  useSpaceMemberRemove,
  useSpaceMemberRoleChange,
} from "./useSpaceMember";

const SPACE_ID = asSpaceId("s_1");
const USER_ID = asUserId("u_target");

describe("useSpaceMemberList", () => {
  it("list 응답이 그대로 노출된다", async () => {
    server.use(
      http.get("*/api/v1/spaces/s_1/members", () =>
        HttpResponse.json(spaceMemberListBody([spaceMemberSummary({ userId: "u_1" })])),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceMemberList(SPACE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].userId).toBe("u_1");
  });
});

describe("useSpaceMemberInvite", () => {
  it("성공 시 같은 space 의 모든 list variant 가 invalidate 된다", async () => {
    let firstListHits = 0;
    let secondListHits = 0;
    let invited = false;
    server.use(
      http.get("*/api/v1/spaces/s_1/members", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("page") === "1") {
          secondListHits += 1;
        } else {
          firstListHits += 1;
        }
        return HttpResponse.json(spaceMemberListBody([]));
      }),
      http.post("*/api/v1/spaces/s_1/members", async () => {
        invited = true;
        return HttpResponse.json(
          {
            spaceId: "s_1",
            role: "MEMBER",
            spaceMemberId: "sm_new",
            userId: "u_target",
          },
          { status: 201 },
        );
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        first: useSpaceMemberList(SPACE_ID, { page: 0, size: 20 }),
        second: useSpaceMemberList(SPACE_ID, { page: 1, size: 20 }),
        invite: useSpaceMemberInvite(SPACE_ID),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.first.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.second.isSuccess).toBe(true));
    expect(firstListHits).toBe(1);
    expect(secondListHits).toBe(1);

    result.current.invite.mutate({ userId: asUserId("u_target"), role: "MEMBER" });

    await waitFor(() => expect(invited).toBe(true));
    await waitFor(() => expect(firstListHits).toBe(2));
    await waitFor(() => expect(secondListHits).toBe(2));
  });

  it("이미 참여 중이면 409 CONFLICT 가 ApiError 로 전달된다", async () => {
    server.use(
      http.post("*/api/v1/spaces/s_1/members", () =>
        HttpResponse.json(
          { code: "SPACE_MEMBER_ALREADY_JOINED", message: "이미 참여한 사용자입니다." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceMemberInvite(SPACE_ID), { wrapper: Wrapper });

    result.current.mutate({ userId: "u_target", role: "MEMBER" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("SPACE_MEMBER_ALREADY_JOINED");
  });

  it("다른 spaceId 의 list 는 invalidation 대상이 아니다 — listBySpace 계층 사유", async () => {
    let otherSpaceListHits = 0;
    server.use(
      http.get("*/api/v1/spaces/s_1/members", () => HttpResponse.json(spaceMemberListBody([]))),
      http.get("*/api/v1/spaces/s_other/members", () => {
        otherSpaceListHits += 1;
        return HttpResponse.json(spaceMemberListBody([]));
      }),
      http.post("*/api/v1/spaces/s_1/members", () =>
        HttpResponse.json(
          { spaceId: "s_1", role: "MEMBER", spaceMemberId: "sm_new", userId: "u_target" },
          { status: 201 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        target: useSpaceMemberList(SPACE_ID),
        other: useSpaceMemberList(asSpaceId("s_other")),
        invite: useSpaceMemberInvite(SPACE_ID),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.target.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.other.isSuccess).toBe(true));
    expect(otherSpaceListHits).toBe(1);

    result.current.invite.mutate({ userId: asUserId("u_target"), role: "MEMBER" });

    await waitFor(() => expect(result.current.invite.isSuccess).toBe(true));
    // 다른 space 의 list 는 재요청되지 않는다.
    expect(otherSpaceListHits).toBe(1);
  });
});

describe("useSpaceMemberRoleChange", () => {
  it("성공 시 같은 space list 가 재요청된다", async () => {
    let listHits = 0;
    let changedRole: string | null = null;
    server.use(
      http.get("*/api/v1/spaces/s_1/members", () => {
        listHits += 1;
        return HttpResponse.json(spaceMemberListBody([]));
      }),
      http.put("*/api/v1/spaces/s_1/members/u_target", async ({ request }) => {
        const body = (await request.json()) as { role: string };
        changedRole = body.role;
        return HttpResponse.json({
          spaceId: "s_1",
          role: body.role,
          spaceMemberId: "sm_target",
          userId: "u_target",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useSpaceMemberList(SPACE_ID),
        change: useSpaceMemberRoleChange(SPACE_ID),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(listHits).toBe(1);

    result.current.change.mutate({ userId: USER_ID, role: "VIEWER" });

    await waitFor(() => expect(result.current.change.isSuccess).toBe(true));
    expect(changedRole).toBe("VIEWER");
    await waitFor(() => expect(listHits).toBe(2));
  });
});

describe("useSpaceMemberRemove", () => {
  it("성공 시 같은 space list 가 재요청되고 반환값은 void", async () => {
    let listHits = 0;
    let removed = false;
    server.use(
      http.get("*/api/v1/spaces/s_1/members", () => {
        listHits += 1;
        return HttpResponse.json(spaceMemberListBody([]));
      }),
      http.delete("*/api/v1/spaces/s_1/members/u_target", () => {
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useSpaceMemberList(SPACE_ID),
        remove: useSpaceMemberRemove(SPACE_ID),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(listHits).toBe(1);

    result.current.remove.mutate(USER_ID);

    await waitFor(() => expect(removed).toBe(true));
    await waitFor(() => expect(listHits).toBe(2));
  });

  it("마지막 OWNER 삭제 시도가 BE 400 으로 떨어지면 ApiError 로 전달된다", async () => {
    server.use(
      http.delete("*/api/v1/spaces/s_1/members/u_target", () =>
        HttpResponse.json(
          {
            code: "SPACE_MEMBER_LAST_OWNER_CANNOT_BE_REMOVED",
            message: "마지막 OWNER 는 제거할 수 없습니다.",
          },
          { status: 400 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpaceMemberRemove(SPACE_ID), { wrapper: Wrapper });

    result.current.mutate(USER_ID);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe("SPACE_MEMBER_LAST_OWNER_CANNOT_BE_REMOVED");
  });
});
