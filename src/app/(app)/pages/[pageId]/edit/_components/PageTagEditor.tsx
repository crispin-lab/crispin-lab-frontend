"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { TagChip } from "@/components/tag/TagChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePageTagAttach,
  usePageTagDetach,
  usePageTagList,
  useTagRegister,
} from "@/hooks/usePageTag";
import { toUserMessage } from "@/lib/api/errors";
import { asTagId, type PageId, type SpaceId, type TagId } from "@/lib/api/ids";
import { spaceTagListOptions } from "@/lib/api/queries/tag";
import type { Tag } from "@/lib/api/types";

// BE 가 `?query=` filter 를 지원하지 않아 client-side filter. 본 PR 시점에 상한 100 — `hasNext` 가 켜지면 panel 하단에
// silent truncation 안내가 노출된다. BE side filter 가 도입되면 본 상수와 hasNext 분기를 함께 제거.
const SPACE_TAG_FETCH_SIZE = 100;

// 한·영 입력 자동완성 매칭의 안전한 normalize — NFC (한글 합자) + lowercase. macOS 의 NFD 입력이나
// 대소문자 mix 입력이 기존 태그와 silent miss 매칭 → 중복 태그 생성으로 새는 경로 차단.
function normalize(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

type Props = {
  pageId: PageId;
  spaceId: SpaceId;
};

export function PageTagEditor({ pageId, spaceId }: Props) {
  const list = usePageTagList(pageId);
  const detach = usePageTagDetach();
  // 동시 다발 detach 추적 — `detach.variables` 는 마지막 호출만 반영하므로 chip 별 disabled 표시가 어긋난다.
  const [pendingDetachIds, setPendingDetachIds] = useState<ReadonlySet<TagId>>(new Set());

  function handleDetach(tagId: TagId) {
    setPendingDetachIds((prev) => {
      const next = new Set(prev);
      next.add(tagId);
      return next;
    });
    detach.mutate(
      { pageId, tagId },
      {
        onSettled: () => {
          setPendingDetachIds((prev) => {
            const next = new Set(prev);
            next.delete(tagId);
            return next;
          });
        },
      },
    );
  }

  if (list.isPending) {
    return (
      <section aria-label="페이지 태그" aria-busy="true">
        <Skeleton className="h-7 w-40 rounded-full" />
      </section>
    );
  }

  if (list.isError) {
    return (
      <section aria-label="페이지 태그">
        <p role="alert" className="text-destructive text-xs">
          {toUserMessage(list.error)}
        </p>
      </section>
    );
  }

  const tags = list.data.items;
  const existingTagIds = tags.map((tag) => tag.tagId);

  return (
    <section aria-label="페이지 태그">
      <ul className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => {
          const tagId = asTagId(tag.tagId);
          return (
            <li key={tag.tagId}>
              <TagChip
                name={tag.name}
                disabled={pendingDetachIds.has(tagId)}
                onRemove={() => handleDetach(tagId)}
              />
            </li>
          );
        })}
        <li>
          <PageTagAddPopover pageId={pageId} spaceId={spaceId} existingTagIds={existingTagIds} />
        </li>
      </ul>
      {detach.isError && (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {toUserMessage(detach.error)}
        </p>
      )}
    </section>
  );
}

type PopoverProps = {
  pageId: PageId;
  spaceId: SpaceId;
  existingTagIds: ReadonlyArray<string>;
};

function PageTagAddPopover({ pageId, spaceId, existingTagIds }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // 닫힐 때 입력 초기화 — 매번 열 때 깨끗한 상태에서 시작.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="xs" aria-label="태그 추가">
            <Plus aria-hidden />
            태그
          </Button>
        }
      />
      <PopoverContent className="w-72">
        <PageTagAddPanel
          pageId={pageId}
          spaceId={spaceId}
          existingTagIds={existingTagIds}
          query={query}
          onQueryChange={setQuery}
          onDone={() => handleOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

type PanelProps = {
  pageId: PageId;
  spaceId: SpaceId;
  existingTagIds: ReadonlyArray<string>;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
};

function PageTagAddPanel({
  pageId,
  spaceId,
  existingTagIds,
  query,
  onQueryChange,
  onDone,
}: PanelProps) {
  const spaceTags = useQuery(spaceTagListOptions(spaceId, { size: SPACE_TAG_FETCH_SIZE }));
  const attach = usePageTagAttach();
  const register = useTagRegister();

  const trimmedQuery = query.trim();
  const normalizedQuery = normalize(trimmedQuery);

  const allItems: ReadonlyArray<Tag> = spaceTags.data?.items ?? [];
  const filtered = allItems.filter((tag) => {
    if (existingTagIds.includes(tag.tagId)) return false;
    if (normalizedQuery === "") return true;
    return normalize(tag.name).includes(normalizedQuery);
  });
  const exactMatch = findExactMatch(allItems, normalizedQuery);
  const showCreate = trimmedQuery !== "" && exactMatch === undefined;
  const hasMore = spaceTags.data?.hasNext === true;

  const busy = attach.isPending || register.isPending;

  function handleAttachExisting(tagId: string) {
    // error 는 attach.error 로 panel 하단에 노출 — promise rejection 만 swallow.
    attach
      .mutateAsync({ pageId, tagId: asTagId(tagId) })
      .then(() => onDone())
      .catch(() => {});
  }

  function handleCreateAndAttach() {
    if (trimmedQuery === "") return;
    // 동명 태그 중복 생성 race 는 BE 의 unique 제약이 책임 — FE 가드는 closure-captured 데이터 위라 dead branch 가 되거나,
    // queryClient.fetchQuery 로 fresh 재검사하면 추가 roundtrip 비용. BE 에러 응답은 attach.error 로 panel 하단에 노출.
    register
      .mutateAsync({ spaceId, name: trimmedQuery })
      .then((result) => attach.mutateAsync({ pageId, tagId: asTagId(result.tagId) }))
      .then(() => onDone())
      .catch(() => {});
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="태그 검색 또는 새 태그 이름"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        disabled={busy}
      />

      {spaceTags.isPending && (
        <p className="text-muted-foreground text-xs">태그 목록을 불러오는 중…</p>
      )}
      {spaceTags.isError && (
        <p role="alert" className="text-destructive text-xs">
          {toUserMessage(spaceTags.error)}
        </p>
      )}

      {!spaceTags.isPending && !spaceTags.isError && (
        <ul className="flex max-h-56 flex-col overflow-y-auto">
          {filtered.map((tag) => (
            <li key={tag.tagId}>
              <button
                type="button"
                onClick={() => handleAttachExisting(tag.tagId)}
                disabled={busy}
                className="hover:bg-muted/50 focus-visible:bg-muted/50 w-full rounded-md px-2 py-1.5 text-left text-sm outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                #{tag.name}
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                onClick={handleCreateAndAttach}
                disabled={busy}
                className="hover:bg-muted/50 focus-visible:bg-muted/50 w-full rounded-md px-2 py-1.5 text-left text-sm outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                + &ldquo;{trimmedQuery}&rdquo; 새로 만들기
              </button>
            </li>
          )}
          {filtered.length === 0 && !showCreate && (
            <li className="text-muted-foreground px-2 py-1.5 text-xs">일치하는 태그가 없습니다.</li>
          )}
        </ul>
      )}

      {hasMore && (
        <p className="text-muted-foreground border-border border-t pt-1.5 text-xs">
          태그가 많아 일부만 보여드립니다. 정확한 이름을 입력해 주세요.
        </p>
      )}

      {(attach.isError || register.isError) && (
        <p role="alert" className="text-destructive text-xs">
          {toUserMessage(attach.error ?? register.error)}
        </p>
      )}
    </div>
  );
}

function findExactMatch(items: ReadonlyArray<Tag>, normalizedQuery: string): Tag | undefined {
  if (normalizedQuery === "") return undefined;
  return items.find((tag) => normalize(tag.name) === normalizedQuery);
}
