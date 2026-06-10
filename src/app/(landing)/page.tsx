import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";

import { searchPagesServer } from "@/lib/api/page.server";
import { pageKeys } from "@/lib/api/queries/page";

import { HeroSection } from "./_components/HeroSection";
import { RECOMMENDED_PARAMS } from "./_components/recommended";
import { RecommendedPageList } from "./_components/RecommendedPageList";

export default async function Landing() {
  const queryClient = new QueryClient();

  // 비로그인 방문자에게도 PUBLIC 추천 페이지를 노출 — visibility 분기는 백엔드 책임.
  await queryClient.prefetchQuery({
    queryKey: pageKeys.list(RECOMMENDED_PARAMS),
    queryFn: () => searchPagesServer(RECOMMENDED_PARAMS, { allowAnonymousFallback: true }),
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16">
      <HeroSection />
      <hr className="border-border" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <RecommendedPageList />
      </HydrationBoundary>
    </main>
  );
}
