import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Page, Space } from "@/lib/api/types";
import { spaceDisplayName } from "@/lib/space/displayName";
import { cn } from "@/lib/utils";

type Props = {
  space: Pick<Space, "spaceId" | "name">;
  ancestors: Page["ancestors"];
  currentTitle: string;
  className?: string;
};

export function PageBreadcrumb({ space, ancestors, currentTitle, className }: Props) {
  // root 페이지 (조상 없음) 에서는 breadcrumb 자체가 정보 무가치 — 스페이스 chip 만으로 충분.
  if (ancestors.length === 0) return null;

  const name = spaceDisplayName(space);

  return (
    <nav
      aria-label="현재 페이지 경로"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1 text-xs",
        className,
      )}
    >
      <Link
        href={`/spaces/${encodeURIComponent(space.spaceId)}`}
        className={cn(
          "hover:text-foreground underline-offset-2 hover:underline",
          name.isFallback && "italic",
        )}
      >
        {name.text}
      </Link>
      {ancestors.map((ancestor) => (
        <span key={ancestor.pageId} className="flex items-center gap-x-1">
          <ChevronRight className="size-3" aria-hidden />
          <Link
            href={`/pages/${encodeURIComponent(ancestor.pageId)}`}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            {ancestor.title}
          </Link>
        </span>
      ))}
      <span className="flex items-center gap-x-1">
        <ChevronRight className="size-3" aria-hidden />
        <span aria-current="page" className="text-foreground/80">
          {currentTitle}
        </span>
      </span>
    </nav>
  );
}
