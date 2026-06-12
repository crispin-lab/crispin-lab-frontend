"use client";

import { EyeOffIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PageSummary } from "@/lib/api/types";
import {
  type Visibility,
  buildNarrowerVisibilityWarning,
  isVisibility,
  isVisibilityNarrowerThan,
} from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

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
  sourceVisibility?: Visibility | null;
};

function narrowerWarningFor(
  rawTarget: string,
  source: Visibility | null | undefined,
): string | null {
  if (source == null) return null;
  if (!isVisibility(rawTarget)) return null;
  if (!isVisibilityNarrowerThan(rawTarget, source)) return null;
  return buildNarrowerVisibilityWarning(rawTarget, source);
}

export const MentionList = forwardRef<MentionListHandle, Props>(function MentionList(
  { items, command, sourceVisibility },
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
      <TooltipProvider delay={0}>
        <ul role="listbox" className="max-h-60 overflow-auto py-1">
          {items.map((item, index) => {
            const warning = narrowerWarningFor(item.visibility, sourceVisibility);
            const warningId = warning != null ? `page-link-warning-${item.pageId}` : undefined;
            return (
              <li
                key={item.pageId}
                role="option"
                aria-selected={index === selectedIndex}
                aria-describedby={warningId}
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
                <span className="flex-1 truncate">{item.title}</span>
                <VisibilityBadge visibility={item.visibility} />
                {warning != null && (
                  <>
                    <Tooltip>
                      {/* listbox option 안의 button 자식은 roving tabindex 모델을 깬다 — span + tabIndex=-1 로 렌더,
                          AT 에는 li 의 aria-describedby 로 전달하므로 trigger 자체는 aria-hidden 처리. */}
                      <TooltipTrigger
                        render={<span />}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-muted-foreground inline-flex items-center"
                      >
                        <EyeOffIcon className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>{warning}</TooltipContent>
                    </Tooltip>
                    <span id={warningId} className="sr-only">
                      {warning}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </TooltipProvider>
    </div>
  );
});
