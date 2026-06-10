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

// tag 처럼 원래 array 인 키가 추가되면 이 변환도 같이 수정 — 그러지 않으면 둘째 이후 값이 silently drop.
function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value) && value.length > 0) search.set(key, value[0]);
  }
  return search;
}
