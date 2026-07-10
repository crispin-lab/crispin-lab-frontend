"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import type { MentionCandidateSummary } from "@/lib/api/types";
import type { MentionContext } from "@/lib/mention/context";
import { cn } from "@/lib/utils";

// suggestion.ts 가 editor DOM 의 `aria-controls` 로 참조하므로 이 상수를 export 한다.
// 페이지 전역에 mention popover 는 동시 하나만 열려 있어 상수 단일 값으로 충분하다.
export const MENTION_USER_LISTBOX_ID = "mention-user-listbox";

// Mention 의 기본 SuggestionOptions 가 TSelected 를 `MentionNodeAttrs ({ id, label })` 로 고정하기 때문에 같은 shape 으로 맞춘다.
// 노드 attribute (`userId`, `handle`) 로의 매핑은 suggestion command 에서 한 번에 처리.
export type MentionUserSelection = {
  id: string | null;
  label?: string | null;
};

export type MentionUserListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type Props = {
  items: MentionCandidateSummary[];
  command: (selection: MentionUserSelection) => void;
  mentionContext: MentionContext | null;
  // suggestion.ts 가 editor DOM 의 `aria-activedescendant` 를 동기화하도록 강조 옵션 변경 시 호출된다.
  onActiveOptionIdChange?: (activeOptionId: string | null) => void;
};

function optionIdFor(item: MentionCandidateSummary | undefined): string | null {
  return item ? `mention-option-${item.userId}` : null;
}

// DRAFT / INTERNAL 페이지는 언급 대상이 사실상 없으므로 안내 문구로 이유를 드러낸다.
// context 가 null 인 경우는 스페이스 · me 로드 이전의 *일시적* 상태라 "검색 실패" 로 오인되지 않게 별도 문구.
function emptyMessage(context: MentionContext | null): string {
  if (context === null) return "페이지 정보를 불러오고 있어요.";
  if (context.pageVisibility === "DRAFT") return "이 페이지는 초안이라 언급 대상이 없어요.";
  if (context.pageVisibility === "INTERNAL") return "이 페이지는 비공개라 언급 대상이 없어요.";
  return "언급할 사용자를 찾을 수 없어요.";
}

export const MentionUserList = forwardRef<MentionUserListHandle, Props>(function MentionUserList(
  { items, command, mentionContext, onActiveOptionIdChange },
  ref,
) {
  const remountKey = items.map((item) => item.userId).join("|");
  return (
    <MentionUserListInner
      ref={ref}
      items={items}
      command={command}
      mentionContext={mentionContext}
      onActiveOptionIdChange={onActiveOptionIdChange}
      key={remountKey}
    />
  );
});

const MentionUserListInner = forwardRef<MentionUserListHandle, Props>(function MentionUserListInner(
  { items, command, mentionContext, onActiveOptionIdChange },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 강조 옵션 → editor DOM `aria-activedescendant` 동기 (외부 시스템 sync 라 useEffect 가 정합).
  useEffect(() => {
    onActiveOptionIdChange?.(optionIdFor(items[selectedIndex]));
  }, [selectedIndex, items, onActiveOptionIdChange]);

  function selectItem(index: number): void {
    const item = items[index];
    if (!item) return;
    command({ id: item.userId, label: item.handle });
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div
        id={MENTION_USER_LISTBOX_ID}
        role="listbox"
        aria-label="사용자 검색 결과"
        className="border-border bg-popover text-popover-foreground rounded-md border p-2 text-sm shadow-md"
      >
        {emptyMessage(mentionContext)}
      </div>
    );
  }

  return (
    <div className="border-border bg-popover text-popover-foreground min-w-48 rounded-md border shadow-md">
      <ul
        id={MENTION_USER_LISTBOX_ID}
        role="listbox"
        aria-label="사용자 검색 결과"
        className="max-h-60 overflow-auto py-1"
      >
        {items.map((item, index) => (
          <li
            id={optionIdFor(item) ?? undefined}
            key={item.userId}
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              "flex cursor-pointer items-center gap-2 px-2 py-1 text-sm",
              index === selectedIndex && "bg-accent text-accent-foreground",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              selectItem(index);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="text-muted-foreground">@</span>
            <span className="flex-1 truncate">{item.handle}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});
