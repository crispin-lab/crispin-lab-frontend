import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PageTreeSidebar } from "@/components/page/PageTreeSidebar";
import { handleSsrAccessError } from "@/lib/api/access.server";
import { fetchMeServer } from "@/lib/api/auth.server";
import { asPageId, asSpaceId } from "@/lib/api/ids";
import { INBOUND_LIST_SIZE } from "@/lib/api/page";
import { fetchInboundLinksServer, fetchPageServer } from "@/lib/api/page.server";
import { fetchPageTagListServer } from "@/lib/api/pageTag.server";
import { pageInboundLinksOptions } from "@/lib/api/queries/page";
import { pageTagListOptions } from "@/lib/api/queries/pageTag";
import { fetchSpaceServer } from "@/lib/api/space.server";
import type { Me, Page, Space } from "@/lib/api/types";
import { makeServerQueryClient } from "@/lib/queryClient";

import { PageReadingView } from "./_components/PageReadingView";

export default async function PageReadingRoute({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId: raw } = await params;
  const pageId = asPageId(raw);
  const returnPath = `/pages/${pageId}`;

  let page: Page;
  try {
    page = await fetchPageServer(pageId, { allowAnonymousFallback: true });
  } catch (error) {
    handleSsrAccessError(error, returnPath);
  }

  // prefetchQuery 는 throw 하지 않는다 — 인바운드 / 태그 실패는 Client 의 useQuery / ErrorRetryCard 가 받는다.
  // fetchMeServer 는 401 을 null 로 흡수해 비로그인 / 만료 세션에서 Promise.all 을 reject 시키지 않는다.
  const queryClient = makeServerQueryClient();
  const inboundParams = { size: INBOUND_LIST_SIZE };
  let space: Space;
  let me: Me | null = null;
  try {
    [space, me] = await Promise.all([
      fetchSpaceServer(asSpaceId(page.spaceId), { allowAnonymousFallback: true }),
      fetchMeServer(),
      queryClient.prefetchQuery({
        ...pageInboundLinksOptions(pageId, inboundParams),
        queryFn: () =>
          fetchInboundLinksServer(pageId, inboundParams, { allowAnonymousFallback: true }),
      }),
      queryClient.prefetchQuery({
        ...pageTagListOptions(pageId),
        queryFn: () => fetchPageTagListServer(pageId, {}, { allowAnonymousFallback: true }),
      }),
    ]);
  } catch (error) {
    handleSsrAccessError(error, returnPath);
  }

  // isAuthenticated 는 cookie 존재가 아니라 실 유효성 (me === null 이면 만료 세션도 false).
  // canEdit 은 BE 의 단일 신호 — FE 가 author === me 로 재계산하면 ADMIN 경로가 누락된다.
  const isAuthenticated = me !== null;
  const canEdit = page.canEdit;

  // grid 골격은 이 라우트 한정 — layout.tsx 에 두면 [pageId]/edit 서브라우트까지 적용돼 편집 화면 폭이 깨진다.
  // sticky top 은 AppHeader 의 h-12 와 정합.
  if (isAuthenticated) {
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <PageTreeSidebar
            spaceId={asSpaceId(page.spaceId)}
            activePageId={pageId}
            canWrite={space.canWrite}
            className="hidden px-3 py-4 lg:sticky lg:top-12 lg:block lg:self-start"
          />
          <PageReadingView
            page={page}
            pageId={pageId}
            space={space}
            isAuthenticated={isAuthenticated}
            canEdit={canEdit}
          />
        </div>
      </HydrationBoundary>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageReadingView
        page={page}
        pageId={pageId}
        space={space}
        isAuthenticated={isAuthenticated}
        canEdit={canEdit}
      />
    </HydrationBoundary>
  );
}
