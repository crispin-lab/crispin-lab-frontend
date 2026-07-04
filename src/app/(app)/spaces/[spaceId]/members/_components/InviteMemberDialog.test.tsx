import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

import { InviteMemberDialog } from "./InviteMemberDialog";

const SPACE_ID_RAW = "s_1";
const SPACE_ID = asSpaceId(SPACE_ID_RAW);

function respondWithUsers(
  items: { userId: string; handle: string; memberOfSpaceIds?: string[] }[],
) {
  return http.get("*/api/v1/users", () =>
    HttpResponse.json({
      items: items.map((u) => ({
        userId: u.userId,
        handle: u.handle,
        memberOfSpaceIds: u.memberOfSpaceIds ?? [],
      })),
    }),
  );
}

describe("InviteMemberDialog · 사용자 검색 UX", () => {
  it("Enter 로 사용자를 chip 으로 추가하고, 여러 명을 한 번에 초대한다", async () => {
    const invited: { userId: string; role: string }[] = [];
    server.use(
      respondWithUsers([
        { userId: "u_alice", handle: "alice" },
        { userId: "u_bob", handle: "bob" },
      ]),
      http.post(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, async ({ request }) => {
        const body = (await request.json()) as { userId: string; role: string };
        invited.push(body);
        return HttpResponse.json(
          {
            spaceMemberId: `sm_${body.userId}`,
            spaceId: SPACE_ID_RAW,
            userId: body.userId,
            role: body.role,
          },
          { status: 201 },
        );
      }),
    );

    const onOpenChange = vi.fn();
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        spaceId={SPACE_ID}
        open={true}
        onOpenChange={onOpenChange}
        existingMemberUserIds={new Set()}
      />,
      { wrapper: Wrapper },
    );

    const input = await screen.findByLabelText("사용자 검색");
    await user.type(input, "a");
    // 검색 결과가 노출될 때까지 대기 (150ms debounce + fetch).
    await screen.findByRole("option", { name: /@alice/ });
    // Enter — 첫 하이라이트 (alice) 가 chip 으로 추가.
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: /@alice 선택 해제/ })).toBeInTheDocument();
    expect(input).toHaveValue("");

    // 다시 검색해 bob 을 추가.
    await user.type(input, "b");
    await screen.findByRole("option", { name: /@bob/ });
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: /@bob 선택 해제/ })).toBeInTheDocument();

    // 초대 버튼 라벨이 "2명 초대" 로 바뀜 + 클릭 시 두 mutation 이 발생.
    await user.click(screen.getByRole("button", { name: "2명 초대" }));
    await waitFor(() => expect(invited).toHaveLength(2));
    expect(invited.map((i) => i.userId).sort()).toEqual(["u_alice", "u_bob"]);
    expect(invited.every((i) => i.role === "MEMBER")).toBe(true);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("이미 스페이스에 참여 중인 사용자는 검색 결과에서 숨는다", async () => {
    server.use(
      respondWithUsers([
        // memberOfSpaceIds 에 spaceId 가 포함된 alice — BE 기준으로 이미 멤버.
        { userId: "u_alice", handle: "alice", memberOfSpaceIds: [SPACE_ID_RAW] },
        { userId: "u_bob", handle: "bob" },
        // 로컬 캐시 fallback 으로 걸러야 하는 carol (memberOfSpaceIds 는 못 잡는 100+ 멤버 시나리오).
        { userId: "u_carol", handle: "carol" },
      ]),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        spaceId={SPACE_ID}
        open={true}
        onOpenChange={vi.fn()}
        existingMemberUserIds={new Set(["u_carol"])}
      />,
      { wrapper: Wrapper },
    );

    const input = await screen.findByLabelText("사용자 검색");
    await user.type(input, "a");

    // bob 만 검색 결과에 남는다.
    await screen.findByRole("option", { name: /@bob/ });
    expect(screen.queryByRole("option", { name: /@alice/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /@carol/ })).not.toBeInTheDocument();
  });

  it("빈 검색어 상태에서 Backspace 는 마지막 chip 을 제거한다", async () => {
    server.use(respondWithUsers([{ userId: "u_alice", handle: "alice" }]));

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        spaceId={SPACE_ID}
        open={true}
        onOpenChange={vi.fn()}
        existingMemberUserIds={new Set()}
      />,
      { wrapper: Wrapper },
    );

    const input = await screen.findByLabelText("사용자 검색");
    await user.type(input, "a");
    await screen.findByRole("option", { name: /@alice/ });
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: /@alice 선택 해제/ })).toBeInTheDocument();

    // 검색어가 빈 상태에서 Backspace → 마지막 chip 제거.
    await user.click(input);
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: /@alice 선택 해제/ })).not.toBeInTheDocument();
  });

  it("OWNER role 로 초대 시 별도 confirm dialog 를 거친다", async () => {
    const invited: { userId: string; role: string }[] = [];
    server.use(
      respondWithUsers([{ userId: "u_alice", handle: "alice" }]),
      http.post(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, async ({ request }) => {
        const body = (await request.json()) as { userId: string; role: string };
        invited.push(body);
        return HttpResponse.json(
          { spaceMemberId: "sm_1", spaceId: SPACE_ID_RAW, userId: body.userId, role: body.role },
          { status: 201 },
        );
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        spaceId={SPACE_ID}
        open={true}
        onOpenChange={vi.fn()}
        existingMemberUserIds={new Set()}
      />,
      { wrapper: Wrapper },
    );

    await user.type(await screen.findByLabelText("사용자 검색"), "a");
    await screen.findByRole("option", { name: /@alice/ });
    await user.keyboard("{Enter}");

    // 역할을 OWNER 로 변경.
    await user.click(screen.getByRole("combobox", { name: "역할" }));
    await user.click(await screen.findByRole("option", { name: "소유자" }));

    // "1명 초대" 클릭 → confirm dialog 가 열려야 한다.
    await user.click(screen.getByRole("button", { name: /1명 초대/ }));
    const confirmDialog = await screen.findByRole("alertdialog", { name: /OWNER 로 초대/ });
    // 아직 mutation 은 발생하지 않는다.
    expect(invited).toHaveLength(0);

    await user.click(within(confirmDialog).getByRole("button", { name: /OWNER 로 초대/ }));
    await waitFor(() => expect(invited).toEqual([{ userId: "u_alice", role: "OWNER" }]));
  });

  it("초대 mutation 실패 시 에러가 dialog 안에 노출되고 실패한 사용자만 chip 에 남는다", async () => {
    server.use(
      respondWithUsers([
        { userId: "u_alice", handle: "alice" },
        { userId: "u_bob", handle: "bob" },
      ]),
      http.post(`*/api/v1/spaces/${SPACE_ID_RAW}/members`, async ({ request }) => {
        const body = (await request.json()) as { userId: string; role: string };
        if (body.userId === "u_alice") {
          return HttpResponse.json(
            { code: "SPACE_MEMBER_ALREADY_JOINED", message: "이미 참여한 사용자입니다." },
            { status: 409 },
          );
        }
        return HttpResponse.json(
          { spaceMemberId: "sm_bob", spaceId: SPACE_ID_RAW, userId: body.userId, role: body.role },
          { status: 201 },
        );
      }),
    );

    const onOpenChange = vi.fn();
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        spaceId={SPACE_ID}
        open={true}
        onOpenChange={onOpenChange}
        existingMemberUserIds={new Set()}
      />,
      { wrapper: Wrapper },
    );

    const input = await screen.findByLabelText("사용자 검색");
    await user.type(input, "a");
    await screen.findByRole("option", { name: /@alice/ });
    await user.keyboard("{Enter}");
    await user.type(input, "b");
    await screen.findByRole("option", { name: /@bob/ });
    await user.keyboard("{Enter}");

    await user.click(screen.getByRole("button", { name: /2명 초대/ }));

    // alice 실패 · bob 성공 → dialog 는 닫히지 않고, alice chip 만 남는다.
    await screen.findByText(/@alice: 이미 참여한 사용자입니다/);
    expect(screen.getByRole("button", { name: /@alice 선택 해제/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /@bob 선택 해제/ })).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("ArrowDown 으로 두 번째 결과를 하이라이트하고 Enter 로 추가한다", async () => {
    server.use(
      respondWithUsers([
        { userId: "u_alice", handle: "alice" },
        { userId: "u_alice_kim", handle: "alice_kim" },
      ]),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        spaceId={SPACE_ID}
        open={true}
        onOpenChange={vi.fn()}
        existingMemberUserIds={new Set()}
      />,
      { wrapper: Wrapper },
    );

    await user.type(await screen.findByLabelText("사용자 검색"), "a");
    await screen.findByRole("option", { name: /@alice_kim/ });

    // ArrowDown → 두 번째 항목 하이라이트 → Enter → alice_kim 추가.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(await screen.findByRole("button", { name: /@alice_kim 선택 해제/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /@alice 선택 해제/ })).not.toBeInTheDocument();
  });
});
