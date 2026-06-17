import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { searchPagesServer } from "@/lib/api/page.server";
import { pageKeys } from "@/lib/api/queries/page";
import { makeServerQueryClient } from "@/lib/queryClient";
import { parseSearchParams } from "@/lib/search/searchParams";

import { SearchResultsView } from "./_components/SearchResultsView";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const urlSearchParams = toURLSearchParams(raw);
  const params = parseSearchParams(urlSearchParams);

  const queryClient = makeServerQueryClient();
  // 비로그인 방문자도 PUBLIC 결과는 노출 — visibility 분기는 BE 가 인증 컨텍스트로 처리.
  await queryClient.prefetchQuery({
    queryKey: pageKeys.list(params),
    queryFn: () => searchPagesServer(params, { allowAnonymousFallback: true }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SearchResultsView />
    </HydrationBoundary>
  );
}

// `?tag=A&tag=B` 처럼 같은 키가 반복되는 케이스를 보존해 array 값을 silently drop 하지 않는다.
function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    }
  }
  return search;
}
