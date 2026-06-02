"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { cn } from "@/lib/utils";
import type { PageSummary } from "@/lib/api/types";

// Mention 의 기본 SuggestionOptions 가 TSelected 를 `MentionNodeAttrs ({ id, label })` 로 고정하기 때문에 같은 shape 으로 맞춘다.
// 노드 attribute (`pageId`, `displayText`) 로의 매핑은 suggestion command 에서 한 번에 처리.
export type PageLinkSelection = {
  id: string | null;
  label?: string | null;
};

export type MentionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type Props = {
  items: PageSummary[];
  command: (selection: PageLinkSelection) => void;
};

export const MentionList = forwardRef<MentionListHandle, Props>(function MentionList(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  function selectItem(index: number) {
    const item = items[index];
    if (!item) return;
    command({ id: item.pageId, label: item.title });
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
        className="border-border bg-popover text-popover-foreground rounded-md border p-2 text-sm shadow-md"
      >
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="border-border bg-popover text-popover-foreground min-w-48 rounded-md border shadow-md">
      <ul role="listbox" className="max-h-60 overflow-auto py-1">
        {items.map((item, index) => (
          <li
            key={item.pageId}
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              "cursor-pointer px-2 py-1 text-sm",
              index === selectedIndex && "bg-accent text-accent-foreground",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              selectItem(index);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
});
