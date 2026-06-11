"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { PageHeading } from "@/components/PageHeading";
import { usePageList } from "@/hooks/usePage";
import { parseSearchParams } from "@/lib/search/searchParams";
import { cn } from "@/lib/utils";

import { SearchFilters } from "./SearchFilters";
import { SearchPagination } from "./SearchPagination";
import { SearchResultList } from "./SearchResultList";

type Props = {
  className?: string;
};

export function SearchResultsView({ className }: Props) {
  const rawSearchParams = useSearchParams();
  const params = useMemo(() => parseSearchParams(rawSearchParams), [rawSearchParams]);

  const query = usePageList(params);

  return (
    <main className={cn("mx-auto w-full max-w-3xl space-y-6 px-6 py-10", className)}>
      <SearchHeader query={params.query} totalElements={query.data?.totalElements} />
      <SearchFilters current={params} />
      <SearchResultList query={query} searchQuery={params.query} />
      {query.data !== undefined && (
        <SearchPagination
          current={params}
          page={query.data.page}
          totalPages={query.data.totalPages}
          hasNext={query.data.hasNext}
        />
      )}
    </main>
  );
}

function SearchHeader({
  query,
  totalElements,
}: {
  query: string | undefined;
  totalElements: number | undefined;
}) {
  return (
    <header className="space-y-1">
      <PageHeading>{query === undefined ? "검색" : <>&ldquo;{query}&rdquo;</>}</PageHeading>
      {totalElements !== undefined && (
        <p className="text-muted-foreground text-sm">
          결과 {totalElements.toLocaleString("ko-KR")}건
        </p>
      )}
    </header>
  );
}
