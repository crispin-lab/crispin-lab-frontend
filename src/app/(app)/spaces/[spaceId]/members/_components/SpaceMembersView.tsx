"use client";

import { ChevronLeftIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { PageHeading } from "@/components/PageHeading";
import { memberDisplayHandle } from "@/components/space/MemberUserLabel";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useAuth";
import {
  useSpaceMemberList,
  useSpaceMemberRemove,
  useSpaceMemberRoleChange,
} from "@/hooks/useSpaceMember";
import { ApiError } from "@/lib/api/client";
import { asUserId, type SpaceId } from "@/lib/api/ids";
import type { SpaceMemberRole, SpaceMemberSummary } from "@/lib/api/types";
import { isSpaceMemberRole, spaceMemberRoleLabel } from "@/lib/space/memberRole";

import { MEMBERS_DEFAULT_SIZE } from "./constants";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { MemberListSection } from "./MemberListSection";
import { MembersPagination } from "./MembersPagination";

type Props = {
  spaceId: SpaceId;
};

export function SpaceMembersView({ spaceId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { page, size } = parseMembersSearchParams(searchParams);

  const meQuery = useMe();
  const meUserId = meQuery.data?.userId;

  const query = useSpaceMemberList(spaceId, { page, size }, { refetchOnMount: "always" });

  // members list 자체가 404/403 을 던지면 SpaceDetail 과 동일하게 존재 여부를 흡수.
  // `!isFetching` 가드: refetch 도중에는 판정하지 않아 stale 캐시가 회복될 기회를 남긴다.
  if (
    query.isError &&
    !query.isFetching &&
    query.error instanceof ApiError &&
    (query.error.status === 403 || query.error.status === 404)
  ) {
    notFound();
  }

  // row-remove ↔ leave 두 dialog 가 mutation 을 공유하면 각 dialog 의 `isPending` 이 서로 튀고,
  // 한쪽 dialog 를 닫을 때 부르는 `reset()` 이 진행 중인 다른 흐름을 건드릴 여지가 있다.
  // 별도 instance 로 격리 — invalidation 은 성공한 쪽만 fire.
  const roleChange = useSpaceMemberRoleChange(spaceId);
  const rowRemove = useSpaceMemberRemove(spaceId);
  const leaveRemove = useSpaceMemberRemove(spaceId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SpaceMemberSummary | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [promotionTarget, setPromotionTarget] = useState<SpaceMemberSummary | null>(null);

  const items = query.data?.items ?? [];
  // meUserId · member.userId 는 응답 경계의 raw string. self 판정만 하는 지역 비교라 여기서는 lift 하지 않는다.
  // 브랜드 타입은 mutation payload (asUserId 로 lift) 로 흐를 때만 강제.
  const viewerMember = meUserId != null ? items.find((m) => m.userId === meUserId) : undefined;
  const viewerRole =
    viewerMember != null && isSpaceMemberRole(viewerMember.role) ? viewerMember.role : undefined;
  const canManage = viewerRole === "OWNER";

  const ownerCountVisible = items.filter((m) => m.role === "OWNER").length;
  const singleOwnerVisible =
    query.data != null && query.data.totalPages <= 1 && ownerCountVisible <= 1;

  const isMutating = roleChange.isPending || rowRemove.isPending || leaveRemove.isPending;

  function handleRoleChangeRequest(member: SpaceMemberSummary, role: SpaceMemberRole) {
    // OWNER 승격은 dropdown radio 클릭이 부주의로 발생하기 쉽고 되돌리기 비용이 큰 액션이라 confirm 을 거친다.
    if (role === "OWNER") {
      setPromotionTarget(member);
      return;
    }
    roleChange.mutate({ userId: asUserId(member.userId), role });
  }

  function handlePromotionConfirm() {
    if (promotionTarget == null) return;
    roleChange.mutate(
      { userId: asUserId(promotionTarget.userId), role: "OWNER" },
      { onSuccess: () => setPromotionTarget(null) },
    );
  }

  function handleRemoveConfirm() {
    if (removeTarget == null) return;
    rowRemove.mutate(asUserId(removeTarget.userId), {
      onSuccess: () => setRemoveTarget(null),
    });
  }

  function handleLeaveConfirm() {
    if (meUserId == null) return;
    leaveRemove.mutate(asUserId(meUserId), {
      onSuccess: () => {
        setLeaveOpen(false);
        router.push("/spaces");
      },
    });
  }

  return (
    <>
      <header className="space-y-3">
        <Link
          href={`/spaces/${encodeURIComponent(spaceId)}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeftIcon className="size-4" /> 스페이스로 돌아가기
        </Link>
        <div className="flex items-center justify-between gap-3">
          <PageHeading>멤버</PageHeading>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <PlusIcon /> 멤버 초대
            </Button>
          )}
        </div>
      </header>

      <MemberListSection
        query={query}
        viewerUserId={meUserId}
        viewerRole={viewerRole}
        singleOwnerVisible={singleOwnerVisible}
        isMutating={isMutating}
        onRoleChangeRequest={handleRoleChangeRequest}
        onRemoveRequest={setRemoveTarget}
        onLeaveRequest={() => setLeaveOpen(true)}
      />

      {query.data != null && query.data.totalPages > 1 && (
        <MembersPagination
          spaceId={spaceId}
          page={page}
          size={size}
          totalPages={query.data.totalPages}
        />
      )}

      <InviteMemberDialog spaceId={spaceId} open={inviteOpen} onOpenChange={setInviteOpen} />

      <DeleteConfirmDialog
        open={removeTarget != null}
        onOpenChange={(next) => {
          if (!next) {
            setRemoveTarget(null);
            rowRemove.reset();
          }
        }}
        title="멤버를 제거할까요?"
        description={
          removeTarget != null
            ? `${describeMember(removeTarget)} — 제거된 멤버는 이 스페이스에 접근할 수 없습니다.`
            : "제거된 멤버는 이 스페이스에 접근할 수 없습니다."
        }
        confirmLabel="제거"
        pendingLabel="제거 중…"
        isPending={rowRemove.isPending}
        onConfirm={handleRemoveConfirm}
      />

      <DeleteConfirmDialog
        open={leaveOpen}
        onOpenChange={(next) => {
          if (!next) {
            setLeaveOpen(false);
            leaveRemove.reset();
          }
        }}
        title="스페이스에서 나갈까요?"
        description={
          viewerRole === "OWNER"
            ? "OWNER 로 나가면 다른 OWNER 가 다시 초대할 때까지 이 스페이스의 페이지에 접근할 수 없습니다."
            : "다시 초대받기 전까지는 이 스페이스의 페이지에 접근할 수 없습니다."
        }
        confirmLabel="나가기"
        pendingLabel="나가는 중…"
        isPending={leaveRemove.isPending}
        onConfirm={handleLeaveConfirm}
      />

      <DeleteConfirmDialog
        open={promotionTarget != null}
        onOpenChange={(next) => {
          if (!next) {
            setPromotionTarget(null);
            roleChange.reset();
          }
        }}
        title="OWNER 로 승격할까요?"
        description={
          promotionTarget != null
            ? `${describeMember(promotionTarget)} — OWNER 는 멤버 초대·역할 변경·제거 권한을 갖습니다.`
            : "OWNER 는 멤버 초대·역할 변경·제거 권한을 갖습니다."
        }
        confirmLabel="OWNER 로 승격"
        pendingLabel="승격 중…"
        isPending={roleChange.isPending}
        // 승격은 파괴적 액션이 아니라 권한 확장 — 빨간 강조 대신 default 색.
        confirmVariant="default"
        onConfirm={handlePromotionConfirm}
      />
    </>
  );
}

// confirm dialog 에서 대상 멤버를 인지할 수 있게 role + handle.
function describeMember(member: SpaceMemberSummary): string {
  const roleLabel = isSpaceMemberRole(member.role)
    ? spaceMemberRoleLabel(member.role)
    : member.role;
  return `${roleLabel} · ${memberDisplayHandle(member.handle)}`;
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

function parseMembersSearchParams(raw: ReadonlyURLSearchParams): { page: number; size: number } {
  const rawPage = raw.get("page");
  const parsedPage = rawPage !== null ? Number(rawPage) : 0;
  const page = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

  const rawSize = raw.get("size");
  const parsedSize = rawSize !== null ? Number(rawSize) : MEMBERS_DEFAULT_SIZE;
  const size =
    Number.isInteger(parsedSize) && parsedSize >= 1 && parsedSize <= 100
      ? parsedSize
      : MEMBERS_DEFAULT_SIZE;

  return { page, size };
}
