"use client";

import { MoreHorizontalIcon } from "lucide-react";

import { MemberUserLabel, memberDisplayHandle } from "@/components/space/MemberUserLabel";
import { RoleBadge } from "@/components/space/RoleBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SpaceMemberRole, SpaceMemberSummary } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";
import {
  isSpaceMemberRole,
  SPACE_MEMBER_ROLE_DISPLAY_ORDER,
  spaceMemberRoleLabel,
} from "@/lib/space/memberRole";

type Props = {
  member: SpaceMemberSummary;
  viewerRole: SpaceMemberRole | undefined;
  isSelf: boolean;
  // items 안에 OWNER 가 유일하고 여러 페이지에 흩어질 여지가 없을 때 true —
  // 마지막 OWNER 강등 · 제거 사전 차단 조건.
  singleOwnerVisible: boolean;
  isMutating: boolean;
  onRoleChangeRequest: (member: SpaceMemberSummary, role: SpaceMemberRole) => void;
  onRemoveRequest: (member: SpaceMemberSummary) => void;
  onLeaveRequest: () => void;
};

export function MemberRow({
  member,
  viewerRole,
  isSelf,
  singleOwnerVisible,
  isMutating,
  onRoleChangeRequest,
  onRemoveRequest,
  onLeaveRequest,
}: Props) {
  const currentRole = isSpaceMemberRole(member.role) ? member.role : undefined;
  const canManage = viewerRole === "OWNER";

  // 마지막 OWNER 자신을 강등/제거하려는 시도는 사전 차단.
  const isLastOwnerLock = singleOwnerVisible && currentRole === "OWNER";

  const roleLabel = currentRole != null ? spaceMemberRoleLabel(currentRole) : member.role;
  const actionLabel = `${roleLabel} ${memberDisplayHandle(member.handle)} 액션 열기`;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <MemberUserLabel handle={member.handle} />
      </div>
      <RoleBadge role={member.role} />
      <time
        dateTime={member.joinedAt}
        className="text-muted-foreground hidden text-xs sm:inline"
        aria-label={`가입 ${formatUpdatedAtKR(member.joinedAt)}`}
      >
        {formatUpdatedAtKR(member.joinedAt)}
      </time>
      {(canManage || isSelf) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={actionLabel} disabled={isMutating}>
                <MoreHorizontalIcon />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {canManage && !isSelf && currentRole != null && (
              <>
                <div className="text-muted-foreground px-1.5 py-1 text-xs font-medium">
                  역할 변경
                </div>
                <DropdownMenuRadioGroup
                  value={currentRole}
                  onValueChange={(value) => {
                    if (isSpaceMemberRole(value) && value !== currentRole) {
                      onRoleChangeRequest(member, value);
                    }
                  }}
                >
                  {SPACE_MEMBER_ROLE_DISPLAY_ORDER.map((role) => {
                    // isLastOwnerLock 은 currentRole === "OWNER" 를 함의하므로,
                    // 다른 role 로 이동하려는 시도는 곧 마지막 OWNER 강등.
                    const wouldDowngradeLastOwner = isLastOwnerLock && role !== "OWNER";
                    return (
                      <DropdownMenuRadioItem
                        key={role}
                        value={role}
                        disabled={wouldDowngradeLastOwner}
                      >
                        {spaceMemberRoleLabel(role)}
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isLastOwnerLock}
                  onClick={() => onRemoveRequest(member)}
                >
                  {isLastOwnerLock ? "제거 불가 — 유일한 OWNER" : "제거"}
                </DropdownMenuItem>
              </>
            )}
            {isSelf && (
              <DropdownMenuItem
                variant="destructive"
                disabled={isLastOwnerLock}
                onClick={onLeaveRequest}
              >
                {isLastOwnerLock ? "나갈 수 없음 — 유일한 OWNER" : "스페이스 나가기"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
