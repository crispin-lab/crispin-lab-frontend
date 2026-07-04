"use client";

import { type UseQueryResult } from "@tanstack/react-query";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { SpaceMemberListResult, SpaceMemberRole, SpaceMemberSummary } from "@/lib/api/types";

import { MemberRow } from "./MemberRow";

type Props = {
  query: UseQueryResult<SpaceMemberListResult, ApiError>;
  viewerUserId: string | undefined;
  viewerRole: SpaceMemberRole | undefined;
  singleOwnerVisible: boolean;
  isMutating: boolean;
  onRoleChangeRequest: (member: SpaceMemberSummary, role: SpaceMemberRole) => void;
  onRemoveRequest: (member: SpaceMemberSummary) => void;
  onLeaveRequest: () => void;
};

export function MemberListSection({
  query,
  viewerUserId,
  viewerRole,
  singleOwnerVisible,
  isMutating,
  onRoleChangeRequest,
  onRemoveRequest,
  onLeaveRequest,
}: Props) {
  if (query.isPending) {
    return <MemberListSkeleton />;
  }
  if (query.isError) {
    return (
      <ErrorRetryCard
        message={toUserMessage(query.error)}
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const items = query.data.items;
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <p className="text-sm">아직 멤버가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="divide-border divide-y overflow-hidden rounded-lg border">
      {items.map((member) => (
        <MemberRow
          key={member.spaceMemberId}
          member={member}
          viewerRole={viewerRole}
          isSelf={viewerUserId != null && member.userId === viewerUserId}
          singleOwnerVisible={singleOwnerVisible}
          isMutating={isMutating}
          onRoleChangeRequest={onRoleChangeRequest}
          onRemoveRequest={onRemoveRequest}
          onLeaveRequest={onLeaveRequest}
        />
      ))}
    </ul>
  );
}

function MemberListSkeleton() {
  return (
    <ul aria-hidden="true" className="divide-border divide-y overflow-hidden rounded-lg border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-4 w-16" />
        </li>
      ))}
    </ul>
  );
}
