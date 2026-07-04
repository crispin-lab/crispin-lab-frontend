"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpaceMemberInvite } from "@/hooks/useSpaceMember";
import { useUserSearch } from "@/hooks/useUserSearch";
import type { SpaceId, UserId } from "@/lib/api/ids";
import type { SpaceMemberRole, UserSummary } from "@/lib/api/types";
import {
  isSpaceMemberRole,
  SPACE_MEMBER_INVITE_ROLE_ORDER,
  spaceMemberRoleDescription,
  spaceMemberRoleLabel,
} from "@/lib/space/memberRole";
import { cn } from "@/lib/utils";

type Props = {
  spaceId: SpaceId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteMemberDialog({ spaceId, open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [role, setRole] = useState<SpaceMemberRole>("MEMBER");
  const searchQuery = useUserSearch(query);
  const invite = useSpaceMemberInvite(spaceId);

  function reset() {
    setQuery("");
    setSelectedUser(null);
    setRole("MEMBER");
    invite.reset();
  }

  function handleOpenChange(next: boolean) {
    if (invite.isPending && !next) return;
    onOpenChange(next);
    if (!next) reset();
  }

  function handleSubmit() {
    if (selectedUser == null || invite.isPending) return;
    invite.mutate(
      { userId: selectedUser.userId, role },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent size="default" className="max-w-md sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>멤버 초대</AlertDialogTitle>
          <AlertDialogDescription>초대할 사용자를 검색해 역할을 지정하세요.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-member-search">사용자 검색</Label>
            <Input
              id="invite-member-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedUser(null);
              }}
              placeholder="handle 로 검색"
              autoComplete="off"
              disabled={invite.isPending}
            />
            <UserSearchResults
              query={query}
              isPending={searchQuery.isFetching}
              items={searchQuery.data?.items ?? []}
              selectedUserId={selectedUser?.userId ?? null}
              onSelect={setSelectedUser}
              disabled={invite.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-member-role-trigger">역할</Label>
            <Select
              value={role}
              onValueChange={(value) => {
                if (typeof value === "string" && isSpaceMemberRole(value)) {
                  setRole(value);
                }
              }}
              disabled={invite.isPending}
            >
              <SelectTrigger id="invite-member-role-trigger" aria-label="역할">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPACE_MEMBER_INVITE_ROLE_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {spaceMemberRoleLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{spaceMemberRoleDescription(role)}</p>
            {role === "OWNER" && (
              <p role="alert" className="text-destructive text-xs">
                OWNER 는 멤버 초대·역할 변경·제거 권한을 갖습니다. 신중히 지정하세요.
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={invite.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            disabled={invite.isPending || selectedUser == null}
            onClick={handleSubmit}
          >
            {invite.isPending ? "초대 중…" : "초대"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UserSearchResults({
  query,
  isPending,
  items,
  selectedUserId,
  onSelect,
  disabled,
}: {
  query: string;
  isPending: boolean;
  items: UserSummary[];
  selectedUserId: UserId | null;
  onSelect: (user: UserSummary) => void;
  disabled: boolean;
}) {
  if (query.trim() === "") {
    return (
      <p className="text-muted-foreground text-xs">
        handle 를 입력하면 사용자 검색 결과가 나타납니다.
      </p>
    );
  }
  if (isPending) {
    return <p className="text-muted-foreground text-xs">검색 중…</p>;
  }
  if (items.length === 0) {
    return <p className="text-muted-foreground text-xs">일치하는 사용자가 없습니다.</p>;
  }
  return (
    <ul className="border-border max-h-40 divide-y overflow-y-auto rounded-md border">
      {items.map((user) => {
        const isSelected = selectedUserId === user.userId;
        return (
          <li key={user.userId}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(user)}
              aria-pressed={isSelected}
              className={cn(
                "hover:bg-muted/60 focus-visible:bg-muted/60 flex w-full items-center px-3 py-2 text-left text-sm outline-none",
                isSelected && "bg-muted",
              )}
            >
              <span className="text-accent-secondary">@{user.handle}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
