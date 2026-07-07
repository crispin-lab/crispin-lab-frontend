"use client";

import Link from "next/link";

import { FormattedTime } from "@/components/common/FormattedTime";
import type { PageSummary } from "@/lib/api/types";

type Props = {
  page: PageSummary;
  spaceName: string | null;
};

export function SearchResultRow({ page, spaceName }: Props) {
  return (
    <Link
      href={`/pages/${encodeURIComponent(page.pageId)}`}
      className="hover:bg-muted/40 hover:shadow-accent-glow focus-visible:ring-ring flex flex-col gap-1 rounded-md px-2 py-3 transition-shadow duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="truncate text-sm font-medium">{page.title}</span>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        {spaceName !== null && <span className="truncate">{spaceName}</span>}
        {spaceName !== null && <span aria-hidden>·</span>}
        <FormattedTime iso={page.updatedAt} />
      </span>
    </Link>
  );
}
