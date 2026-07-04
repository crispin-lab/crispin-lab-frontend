import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { spaceMemberListBody, spaceMemberSummary } from "@/test/fixtures/spaceMember";
import { createQueryWrapper } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => new URLSearchParams(),
}));

import { SpaceMembersView } from "./SpaceMembersView";

const SPACE_ID_RAW = "s_1";
const SPACE_ID = asSpaceId(SPACE_ID_RAW);

const OWNER_ME = { userId: "u_owner", handle: "owner", email: "o@x", role: "USER" as const };
const MEMBER_ME = { userId: "u_member", handle: "member", email: "m@x", role: "USER" as const };

beforeEach(() => {
  routerPush.mockReset();
  toastError.mockReset();
});

describe("SpaceMembersView", () => {
  it("OWNER 시점에는 '멤버 초대' 버튼과 각 row 의 action dropdown 이 노출된다", async () => {
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
            spaceMemberSummary({
              spaceMemberId: "sm_2",
              userId: "u_member",
              role: "MEMBER",
              handle: "member",
            }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByRole("heading", { name: "멤버" })).toBeInTheDocument();
    // 각 row 의 action dropdown 이 노출된다 — MEMBER row 도 (OWNER 시점에서 관리 가능).
    // list 가 로드된 뒤 me 로 viewerRole 이 산출되어야 초대 버튼도 노출.
    expect(await screen.findByRole("button", { name: /@member 액션/ })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /멤버 초대/ })).toBeInTheDocument();
  });

  it("MEMBER 시점에는 관리 UI 는 숨고 자기 자신 row 에 '스페이스 나가기' 만 노출된다", async () => {
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(MEMBER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
            spaceMemberSummary({
              spaceMemberId: "sm_2",
              userId: "u_member",
              role: "MEMBER",
              handle: "member",
            }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    await screen.findByRole("heading", { name: "멤버" });
    // 초대 버튼 미노출.
    expect(screen.queryByRole("button", { name: /멤버 초대/ })).not.toBeInTheDocument();
    // OWNER row 의 dropdown 은 없다 (자기 자신 아님).
    expect(screen.queryByRole("button", { name: /@owner 액션/ })).not.toBeInTheDocument();
    // 자기 자신 row 의 dropdown 은 있다.
    const selfMenu = await screen.findByRole("button", { name: /@member 액션/ });
    await user.click(selfMenu);
    expect(await screen.findByRole("menuitem", { name: /스페이스 나가기/ })).toBeInTheDocument();
  });

  it("마지막 OWNER 는 '스페이스 나가기' 가 disabled 되고 안내 라벨이 나온다", async () => {
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    const menu = await screen.findByRole("button", { name: /@owner 액션/ });
    await user.click(menu);
    const leaveItem = await screen.findByRole("menuitem", {
      name: /스페이스 나가기.*OWNER 는 최소 한 명 유지/,
    });
    expect(leaveItem).toHaveAttribute("data-disabled");
  });

  it("자기 자신 제거 성공 시 /spaces 로 이동한다", async () => {
    let removed = false;
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(MEMBER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
            spaceMemberSummary({
              spaceMemberId: "sm_2",
              userId: "u_member",
              role: "MEMBER",
              handle: "member",
            }),
          ]),
        ),
      ),
      http.delete(`*/api/v1/spaces/${SPACE_ID_RAW}/members/u_member`, () => {
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    const selfMenu = await screen.findByRole("button", { name: /@member 액션/ });
    await user.click(selfMenu);
    await user.click(await screen.findByRole("menuitem", { name: /스페이스 나가기/ }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /나가기/ }));

    await waitFor(() => expect(removed).toBe(true));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/spaces"));
  });

  it("handle 이 빈 문자열이면 row 에 '삭제된 사용자' fallback 라벨이 노출된다", async () => {
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
            spaceMemberSummary({
              spaceMemberId: "sm_ghost",
              userId: "u_deleted",
              role: "MEMBER",
              handle: "",
            }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByText("삭제된 사용자")).toBeInTheDocument();
  });

  it("빈 리스트면 안내 카드가 노출된다", async () => {
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(spaceMemberListBody([])),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 멤버가 없습니다.")).toBeInTheDocument();
  });

  it("OWNER 승격은 radio 클릭만으로 mutate 되지 않고 confirm dialog 를 거친다", async () => {
    const putCalls: string[] = [];
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
            spaceMemberSummary({
              spaceMemberId: "sm_2",
              userId: "u_member",
              role: "MEMBER",
              handle: "member",
            }),
          ]),
        ),
      ),
      http.put(`*/api/v1/spaces/${SPACE_ID_RAW}/members/u_member`, async ({ request }) => {
        const body = (await request.json()) as { role: string };
        putCalls.push(body.role);
        return HttpResponse.json({
          spaceId: SPACE_ID_RAW,
          role: body.role,
          spaceMemberId: "sm_2",
          userId: "u_member",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    const menu = await screen.findByRole("button", { name: /@member 액션/ });
    await user.click(menu);
    await user.click(await screen.findByRole("menuitemradio", { name: /소유자/ }));

    // radio 클릭만으로는 PUT 이 발생하지 않는다.
    expect(putCalls).toEqual([]);
    // 승격 confirm dialog 가 열려 있어야 한다.
    const dialog = await screen.findByRole("alertdialog", { name: /OWNER 로 승격/ });
    await user.click(within(dialog).getByRole("button", { name: /OWNER 로 승격/ }));

    await waitFor(() => expect(putCalls).toEqual(["OWNER"]));
  });

  it("MEMBER/VIEWER 로의 role 변경은 confirm 없이 즉시 mutate 된다", async () => {
    const putCalls: string[] = [];
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_owner", role: "OWNER", handle: "owner" }),
            spaceMemberSummary({
              spaceMemberId: "sm_2",
              userId: "u_member",
              role: "MEMBER",
              handle: "member",
            }),
          ]),
        ),
      ),
      http.put(`*/api/v1/spaces/${SPACE_ID_RAW}/members/u_member`, async ({ request }) => {
        const body = (await request.json()) as { role: string };
        putCalls.push(body.role);
        return HttpResponse.json({
          spaceId: SPACE_ID_RAW,
          role: body.role,
          spaceMemberId: "sm_2",
          userId: "u_member",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    const menu = await screen.findByRole("button", { name: /@member 액션/ });
    await user.click(menu);
    await user.click(await screen.findByRole("menuitemradio", { name: /뷰어/ }));

    await waitFor(() => expect(putCalls).toEqual(["VIEWER"]));
    expect(screen.queryByRole("alertdialog", { name: /OWNER 로 승격/ })).not.toBeInTheDocument();
  });

  it("OWNER 가 여러 명이면 다른 OWNER 를 role 변경 radio 로 강등할 수 있다", async () => {
    server.use(
      http.get("*/api/v1/users/me", () => HttpResponse.json(OWNER_ME)),
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, () =>
        HttpResponse.json(
          spaceMemberListBody([
            spaceMemberSummary({ userId: "u_second_owner", role: "OWNER", handle: "second" }),
            spaceMemberSummary({
              spaceMemberId: "sm_2",
              userId: "u_owner",
              role: "OWNER",
              handle: "owner",
            }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceMembersView spaceId={SPACE_ID} />, { wrapper: Wrapper });

    const menu = await screen.findByRole("button", { name: /@second 액션/ });
    await user.click(menu);
    const viewerRadio = await screen.findByRole("menuitemradio", { name: /뷰어/ });
    expect(viewerRadio).not.toHaveAttribute("data-disabled");
  });
});
