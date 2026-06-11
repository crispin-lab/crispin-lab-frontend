"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import type { PageId } from "@/lib/api/ids";
import type { PageTreeNode as PageTreeNodeData } from "@/lib/page/tree";
import { cn } from "@/lib/utils";

type Props = {
  node: PageTreeNodeData;
  activePageId: PageId;
  defaultExpandedIds: ReadonlySet<string>;
  level: number;
};

// ARIA tree pattern (roving tabindex / ArrowUp/Down 풀스펙) 은 별도 티켓으로 미룸 — 본 컴포넌트는
// 의미상 navigation list 로 처리하고 active 표시는 link 의 aria-current 로, expand 상태는 chevron 의
// aria-expanded 로만 노출. Tab 으로 노드마다 stop 하는 트레이드오프는 받아들임 (대규모 트리에서 별도 보강 예정).
export function PageTreeNode({ node, activePageId, defaultExpandedIds, level }: Props) {
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(
    () => hasChildren && defaultExpandedIds.has(node.page.pageId),
  );

  const isActive = node.page.pageId === activePageId;
  const ChevronIcon = expanded ? ChevronDownIcon : ChevronRightIcon;

  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!hasChildren) return;
    if (event.key === "ArrowRight" && !expanded) {
      event.preventDefault();
      setExpanded(true);
    } else if (event.key === "ArrowLeft" && expanded) {
      event.preventDefault();
      setExpanded(false);
    }
  }

  return (
    <li>
      <div
        onKeyDown={handleRowKeyDown}
        className={cn(
          "relative flex items-center gap-0.5 rounded-md text-sm transition-colors duration-150 ease-out",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive &&
            "bg-sidebar-accent text-foreground hover:bg-sidebar-accent before:bg-accent before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full",
        )}
        // depth 가 동적이라 Tailwind 사다리 (pl-0/pl-3/...) 로 풀리지 않음 — inline style 의도된 트레이드오프.
        style={{ paddingLeft: `${level * 0.75}rem` }}
      >
        {hasChildren ? (
          // tabIndex=-1 — Tab nav 는 노드당 Link 하나만, chevron 은 클릭과 ArrowLeft/Right 로만 토글.
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? "접기" : "펼치기"}
            aria-expanded={expanded}
            className="text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded"
          >
            <ChevronIcon className="size-4" />
          </button>
        ) : (
          <span aria-hidden className="block size-6 shrink-0" />
        )}
        <Link
          href={`/pages/${encodeURIComponent(node.page.pageId)}`}
          aria-current={isActive ? "page" : undefined}
          className="focus-visible:ring-ring block min-w-0 flex-1 truncate rounded py-1.5 pr-2 focus-visible:ring-2 focus-visible:outline-none"
          title={node.page.title}
        >
          {node.page.title}
        </Link>
      </div>

      {hasChildren && expanded && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <PageTreeNode
              key={child.page.pageId}
              node={child}
              activePageId={activePageId}
              defaultExpandedIds={defaultExpandedIds}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
