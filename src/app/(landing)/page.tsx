import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { searchPagesServer } from "@/lib/api/page.server";
import { pageKeys } from "@/lib/api/queries/page";
import { tagKeys } from "@/lib/api/queries/tag";
import { fetchPopularTagsServer } from "@/lib/api/tag.server";
import { makeServerQueryClient } from "@/lib/queryClient";

import { HeroSection } from "./_components/HeroSection";
import { RECOMMENDED_PARAMS } from "./_components/recommended";
import { RecommendedPageList } from "./_components/RecommendedPageList";
import { POPULAR_TAGS_PARAMS } from "./_components/tags";
import { TagCloud } from "./_components/TagCloud";

export default async function Landing() {
  const queryClient = makeServerQueryClient();

  // 비로그인 방문자에게도 PUBLIC 추천 페이지·인기 태그를 노출 — visibility / scope 분기는 백엔드 책임.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: pageKeys.list(RECOMMENDED_PARAMS),
      queryFn: () => searchPagesServer(RECOMMENDED_PARAMS, { allowAnonymousFallback: true }),
    }),
    queryClient.prefetchQuery({
      queryKey: tagKeys.popular(POPULAR_TAGS_PARAMS),
      queryFn: () => fetchPopularTagsServer(POPULAR_TAGS_PARAMS, { allowAnonymousFallback: true }),
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16">
      <HeroSection />
      <hr className="border-border" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <RecommendedPageList />
        <TagCloud />
      </HydrationBoundary>
    </main>
  );
}
