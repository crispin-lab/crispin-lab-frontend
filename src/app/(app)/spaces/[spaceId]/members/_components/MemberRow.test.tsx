import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { spaceMemberSummary } from "@/test/fixtures/spaceMember";

import { MemberRow } from "./MemberRow";

// singleOwnerVisible + currentRole="OWNER" 조합의 방어 로직은 SpaceMembersView 의 파생 flag 로는
// 재현이 어렵다 (viewer OWNER + target OWNER 는 곧 OWNER 최소 2명 = singleOwnerVisible=false).
// 방어 자체가 회귀하지 않도록 MemberRow 를 직접 렌더해 contrived props 로 검증.
describe("MemberRow · 마지막 OWNER 방어", () => {
  it("singleOwnerVisible + OWNER row 에서 강등 (MEMBER/VIEWER) radio 가 disabled 된다", async () => {
    const member = spaceMemberSummary({
      userId: "u_last_owner",
      role: "OWNER",
      handle: "last",
    });
    const user = userEvent.setup();

    render(
      <MemberRow
        member={member}
        viewerRole="OWNER"
        isSelf={false}
        singleOwnerVisible={true}
        isMutating={false}
        onRoleChangeRequest={vi.fn()}
        onRemoveRequest={vi.fn()}
        onLeaveRequest={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /@last 액션/ }));

    const memberRadio = await screen.findByRole("menuitemradio", { name: /^멤버$/ });
    const viewerRadio = screen.getByRole("menuitemradio", { name: /뷰어/ });
    const ownerRadio = screen.getByRole("menuitemradio", { name: /소유자/ });

    expect(memberRadio).toHaveAttribute("data-disabled");
    expect(viewerRadio).toHaveAttribute("data-disabled");
    expect(ownerRadio).not.toHaveAttribute("data-disabled");
  });

  it("singleOwnerVisible + OWNER row 에서 '제거' 도 disabled 된다", async () => {
    const member = spaceMemberSummary({
      userId: "u_last_owner",
      role: "OWNER",
      handle: "last",
    });
    const user = userEvent.setup();

    render(
      <MemberRow
        member={member}
        viewerRole="OWNER"
        isSelf={false}
        singleOwnerVisible={true}
        isMutating={false}
        onRoleChangeRequest={vi.fn()}
        onRemoveRequest={vi.fn()}
        onLeaveRequest={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /@last 액션/ }));

    const removeItem = await screen.findByRole("menuitem", {
      name: /제거.*OWNER 는 최소 한 명 유지/,
    });
    expect(removeItem).toHaveAttribute("data-disabled");
  });
});
