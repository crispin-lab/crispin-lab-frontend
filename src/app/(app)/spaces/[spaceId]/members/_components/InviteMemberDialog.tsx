"use client";

import { XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { Button } from "@/components/ui/button";
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
import { toUserMessage } from "@/lib/api/errors";
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
  // 로컬 캐시 fallback — LAB-150 memberOfSpaceIds 로 못 잡는 100+ 멤버 스페이스 대비 이차 필터.
  existingMemberUserIds: ReadonlySet<string>;
};

export function InviteMemberDialog({ spaceId, open, onOpenChange, existingMemberUserIds }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [role, setRole] = useState<SpaceMemberRole>("MEMBER");
  const [activeIndex, setActiveIndex] = useState(0);
  const [ownerConfirmOpen, setOwnerConfirmOpen] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchQuery = useUserSearch(query);
  const invite = useSpaceMemberInvite(spaceId);

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.userId as string)), [selected]);

  const results = useMemo(() => {
    const raw = searchQuery.data?.items ?? [];
    return raw.filter(
      (u) =>
        !selectedIds.has(u.userId) &&
        !existingMemberUserIds.has(u.userId) &&
        !u.memberOfSpaceIds.some((s) => s === spaceId),
    );
  }, [searchQuery.data, selectedIds, existingMemberUserIds, spaceId]);

  // results 가 짧아지면 activeIndex 가 밖으로 나갈 수 있어 렌더 시 clamp.
  const clampedIndex = results.length === 0 ? -1 : Math.min(activeIndex, results.length - 1);

  const isMutating = batchPending || invite.isPending;

  function reset() {
    setQuery("");
    setSelected([]);
    setRole("MEMBER");
    setActiveIndex(0);
    setOwnerConfirmOpen(false);
    setBatchError(null);
    invite.reset();
  }

  function handleOpenChange(next: boolean) {
    if (isMutating && !next) return;
    onOpenChange(next);
    if (!next) reset();
  }

  function addSelected(user: UserSummary) {
    setSelected((prev) => [...prev, user]);
    setQuery("");
    setBatchError(null);
    searchInputRef.current?.focus();
  }

  function removeSelected(userId: UserId) {
    setSelected((prev) => prev.filter((u) => u.userId !== userId));
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[clampedIndex] ?? results[0];
      if (target != null) addSelected(target);
    } else if (event.key === "Backspace" && query === "" && selected.length > 0) {
      // 검색어가 비어 있을 때 backspace 는 마지막 선택을 제거 — 흔한 tag input UX.
      event.preventDefault();
      setSelected((prev) => prev.slice(0, -1));
    }
  }

  async function actuallyInvite() {
    if (selected.length === 0 || batchPending) return;
    setBatchPending(true);
    setBatchError(null);
    const outcomes = await Promise.allSettled(
      selected.map((u) => invite.mutateAsync({ userId: u.userId, role })),
    );
    const failed: { user: UserSummary; error: unknown }[] = [];
    outcomes.forEach((outcome, i) => {
      if (outcome.status === "rejected") {
        const user = selected[i];
        if (user != null) failed.push({ user, error: outcome.reason });
      }
    });
    setBatchPending(false);
    if (failed.length === 0) {
      onOpenChange(false);
      reset();
      return;
    }
    // 성공한 사용자는 chip 에서 제거하고 실패만 유지 — 사용자가 원인을 인지하고 재시도 가능.
    setSelected(failed.map((f) => f.user));
    setBatchError(failed.map((f) => `@${f.user.handle}: ${toUserMessage(f.error)}`).join(" · "));
  }

  function handleSubmit() {
    if (selected.length === 0 || isMutating) return;
    if (role === "OWNER") {
      setOwnerConfirmOpen(true);
      return;
    }
    actuallyInvite();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent size="default" className="max-w-md sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>멤버 초대</AlertDialogTitle>
          <AlertDialogDescription>
            초대할 사용자를 검색해 역할을 지정하세요. 여러 명을 한 번에 초대할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-member-search">사용자 검색</Label>
            {selected.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="선택된 사용자">
                {selected.map((user) => (
                  <li key={user.userId}>
                    <SelectedUserChip
                      user={user}
                      disabled={isMutating}
                      onRemove={() => removeSelected(user.userId)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Input
              ref={searchInputRef}
              id="invite-member-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="handle 로 검색 (↑/↓ 로 이동, Enter 로 추가)"
              autoComplete="off"
              disabled={isMutating}
              aria-autocomplete="list"
              aria-controls="invite-member-search-results"
              aria-activedescendant={
                results[clampedIndex] != null
                  ? `invite-member-search-result-${results[clampedIndex].userId}`
                  : undefined
              }
            />
            <UserSearchResults
              id="invite-member-search-results"
              query={query}
              isPending={searchQuery.isFetching}
              items={results}
              activeIndex={clampedIndex}
              hasHiddenExistingMember={
                (searchQuery.data?.items.length ?? 0) > results.length + selected.length
              }
              disabled={isMutating}
              onSelect={addSelected}
              onHover={setActiveIndex}
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
              disabled={isMutating}
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

          {batchError != null && (
            <p role="alert" className="text-destructive text-sm">
              {batchError}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMutating}>취소</AlertDialogCancel>
          <AlertDialogAction disabled={isMutating || selected.length === 0} onClick={handleSubmit}>
            {batchPending
              ? "초대 중…"
              : selected.length === 0
                ? "초대"
                : `${selected.length}명 초대`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <OwnerInviteConfirmDialog
        open={ownerConfirmOpen}
        onOpenChange={setOwnerConfirmOpen}
        onConfirm={() => {
          setOwnerConfirmOpen(false);
          actuallyInvite();
        }}
        selectedCount={selected.length}
        isPending={isMutating}
      />
    </AlertDialog>
  );
}

function SelectedUserChip({
  user,
  disabled,
  onRemove,
}: {
  user: UserSummary;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <span className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
      <span className="text-accent-secondary">@{user.handle}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`@${user.handle} 선택 해제`}
        disabled={disabled}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </span>
  );
}

function UserSearchResults({
  id,
  query,
  isPending,
  items,
  activeIndex,
  hasHiddenExistingMember,
  disabled,
  onSelect,
  onHover,
}: {
  id: string;
  query: string;
  isPending: boolean;
  items: UserSummary[];
  activeIndex: number;
  hasHiddenExistingMember: boolean;
  disabled: boolean;
  onSelect: (user: UserSummary) => void;
  onHover: (index: number) => void;
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
    return (
      <p className="text-muted-foreground text-xs">
        {hasHiddenExistingMember
          ? "일치하는 사용자가 모두 이미 참여 중이거나 선택되어 있습니다."
          : "일치하는 사용자가 없습니다."}
      </p>
    );
  }
  return (
    <ul
      id={id}
      role="listbox"
      className="border-border max-h-40 divide-y overflow-y-auto rounded-md border"
    >
      {items.map((user, index) => {
        const isActive = index === activeIndex;
        return (
          <li key={user.userId} role="none">
            <SearchResultItem
              user={user}
              isActive={isActive}
              disabled={disabled}
              onSelect={() => onSelect(user)}
              onHover={() => onHover(index)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function SearchResultItem({
  user,
  isActive,
  disabled,
  onSelect,
  onHover,
}: {
  user: UserSummary;
  isActive: boolean;
  disabled: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);
  return (
    <button
      ref={ref}
      type="button"
      id={`invite-member-search-result-${user.userId}`}
      role="option"
      aria-selected={isActive}
      disabled={disabled}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "hover:bg-muted/40 flex w-full items-center gap-2 border-l-2 border-l-transparent px-3 py-2 text-left text-sm outline-none",
        isActive && "bg-accent text-accent-foreground border-l-accent-foreground hover:bg-accent",
      )}
    >
      <span className={isActive ? "font-medium" : "text-accent-secondary"}>@{user.handle}</span>
    </button>
  );
}

function OwnerInviteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>OWNER 로 초대할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 {selectedCount}명을 OWNER 로 초대합니다. OWNER 는 멤버 초대·역할 변경·제거 권한을
            갖습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending ? "초대 중…" : "OWNER 로 초대"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
