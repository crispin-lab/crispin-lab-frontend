"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { SlashItem } from "./items";

export type SlashMenuListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type Props = {
  items: SlashItem[];
  onSelect: (item: SlashItem) => void;
};

export const SlashMenuList = forwardRef<SlashMenuListHandle, Props>(function SlashMenuList(
  { items, onSelect },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // 'nearest' — 이미 viewport 안이면 no-op, 키보드 nav 로 밖에 나갔을 때만 최소 거리로.
  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function selectItem(index: number) {
    const item = items[index];
    if (!item) return;
    onSelect(item);
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
        일치하는 명령이 없습니다.
      </div>
    );
  }

  return (
    <div className="border-border bg-popover text-popover-foreground min-w-56 rounded-md border shadow-md">
      <ul role="listbox" className="max-h-72 overflow-auto py-1">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li
              key={item.key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm",
                index === selectedIndex && "bg-accent text-accent-foreground",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                selectItem(index);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.hint != null && (
                <span className="text-muted-foreground text-xs">{item.hint}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});
