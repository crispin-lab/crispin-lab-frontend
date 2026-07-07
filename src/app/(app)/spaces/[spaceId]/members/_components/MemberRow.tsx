"use client";

import { MoreHorizontalIcon } from "lucide-react";

import { FormattedTime } from "@/components/common/FormattedTime";
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
      <span className="text-muted-foreground hidden text-xs sm:inline">
        <span className="sr-only">가입 </span>
        <FormattedTime iso={member.joinedAt} />
      </span>
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
                  <div className="flex flex-col gap-0.5">
                    <span>제거</span>
                    {isLastOwnerLock && (
                      <span className="text-muted-foreground text-xs">
                        OWNER 는 최소 한 명 유지되어야 합니다
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              </>
            )}
            {isSelf && (
              <DropdownMenuItem
                variant="destructive"
                disabled={isLastOwnerLock}
                onClick={onLeaveRequest}
              >
                <div className="flex flex-col gap-0.5">
                  <span>스페이스 나가기</span>
                  {isLastOwnerLock && (
                    <span className="text-muted-foreground text-xs">
                      OWNER 는 최소 한 명 유지되어야 합니다
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
