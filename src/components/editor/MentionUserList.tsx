"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

import type { UserSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

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
  items: UserSummary[];
  command: (selection: MentionUserSelection) => void;
};

export const MentionUserList = forwardRef<MentionUserListHandle, Props>(function MentionUserList(
  { items, command },
  ref,
) {
  const remountKey = items.map((item) => item.userId).join("|");
  return <MentionUserListInner ref={ref} items={items} command={command} key={remountKey} />;
});

const MentionUserListInner = forwardRef<MentionUserListHandle, Props>(function MentionUserListInner(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  function selectItem(index: number) {
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
        role="listbox"
        aria-label="사용자 검색 결과"
        className="border-border bg-popover text-popover-foreground rounded-md border p-2 text-sm shadow-md"
      >
        사용자를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="border-border bg-popover text-popover-foreground min-w-48 rounded-md border shadow-md">
      <ul role="listbox" aria-label="사용자 검색 결과" className="max-h-60 overflow-auto py-1">
        {items.map((item, index) => (
          <li
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
