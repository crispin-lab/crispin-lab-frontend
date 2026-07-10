import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { spaceKeys } from "@/lib/api/queries/space";
import { listSpacesServer } from "@/lib/api/space.server";
import { hasSessionCookie } from "@/lib/auth/session";
import { makeServerQueryClient } from "@/lib/queryClient";
import { toURLSearchParams } from "@/lib/routing/searchParams";
import { parseSpaceListSearchParams, SPACE_LIST_PAGE_SIZE } from "@/lib/space/listParams";

import { SpaceListView } from "./_components/SpaceListView";

type SpacesRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpacesRoute({ searchParams }: SpacesRouteProps) {
  const raw = await searchParams;
  const urlSearchParams = toURLSearchParams(raw);
  const params = parseSpaceListSearchParams(urlSearchParams);
  const listParams = { ...params, size: SPACE_LIST_PAGE_SIZE };

  const isAuthenticated = await hasSessionCookie();

  const queryClient = makeServerQueryClient();
  // 비로그인 방문자에게도 PUBLIC 스페이스는 노출 — BE 가 인증 컨텍스트로 visibility 를 분기.
  await queryClient.prefetchQuery({
    queryKey: spaceKeys.list(listParams),
    queryFn: () => listSpacesServer(listParams, { allowAnonymousFallback: true }),
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SpaceListView isAuthenticated={isAuthenticated} />
      </HydrationBoundary>
    </main>
  );
}
