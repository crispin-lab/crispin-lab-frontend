"use client";

import Link from "next/link";

import type { PageSummary } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";

type Props = {
  page: PageSummary;
  spaceName: string | null;
};

export function SearchResultRow({ page, spaceName }: Props) {
  return (
    <Link
      href={`/pages/${encodeURIComponent(page.pageId)}`}
      className="hover:bg-muted/40 focus-visible:ring-ring flex flex-col gap-1 px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="truncate text-sm font-medium">{page.title}</span>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        {spaceName !== null && <span className="truncate">{spaceName}</span>}
        {spaceName !== null && <span aria-hidden>·</span>}
        <time dateTime={page.updatedAt}>{formatUpdatedAtKR(page.updatedAt)}</time>
      </span>
    </Link>
  );
}
