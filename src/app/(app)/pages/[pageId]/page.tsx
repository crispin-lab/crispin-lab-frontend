import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound, redirect } from "next/navigation";

import { PageTreeSidebar } from "@/components/page/PageTreeSidebar";
import { ApiError } from "@/lib/api/client";
import { asPageId, asSpaceId, type PageId } from "@/lib/api/ids";
import { INBOUND_LIST_SIZE } from "@/lib/api/page";
import { fetchInboundLinksServer } from "@/lib/api/page.server";
import { pageInboundLinksOptions } from "@/lib/api/queries/page";
import { apiFetchServer } from "@/lib/api/server";
import { fetchSpaceServer } from "@/lib/api/space.server";
import type { Page, Space } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { hasSessionCookie } from "@/lib/auth/session";
import { makeServerQueryClient } from "@/lib/queryClient";

import { PageReadingView } from "./_components/PageReadingView";

// page / space fetch 가 같은 401·403·404 정책을 공유 — 한쪽만 갱신되는 드리프트 방지.
function handlePageAccessError(error: unknown, pageId: PageId): never {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(loginRedirectUrl(`/pages/${pageId}`));
    if (error.status === 403 || error.status === 404) notFound();
  }
  throw error;
}

export default async function PageReadingRoute({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId: raw } = await params;
  const pageId = asPageId(raw);

  let page: Page;
  try {
    page = await apiFetchServer<Page>(`/v1/pages/${encodeURIComponent(pageId)}`, {
      allowAnonymousFallback: true,
    });
  } catch (error) {
    handlePageAccessError(error, pageId);
  }

  // PageGetResponse 에 spaceName 이 없어 별도 fetch — page 와 같은 visibility scope.
  // prefetchQuery 는 throw 하지 않는다 — 인바운드 실패는 Client 의 useQuery / ErrorRetryCard 가 받는다.
  const queryClient = makeServerQueryClient();
  const inboundParams = { size: INBOUND_LIST_SIZE };
  let space: Space;
  try {
    [space] = await Promise.all([
      fetchSpaceServer(asSpaceId(page.spaceId), { allowAnonymousFallback: true }),
      queryClient.prefetchQuery({
        ...pageInboundLinksOptions(pageId, inboundParams),
        queryFn: () =>
          fetchInboundLinksServer(pageId, inboundParams, { allowAnonymousFallback: true }),
      }),
    ]);
  } catch (error) {
    handlePageAccessError(error, pageId);
  }

  const isAuthenticated = await hasSessionCookie();

  // grid 골격은 이 라우트 한정 — layout.tsx 에 두면 [pageId]/edit 서브라우트까지 적용돼 편집 화면 폭이 깨진다.
  // sticky top 은 AppHeader 의 h-12 와 정합.
  if (isAuthenticated) {
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <PageTreeSidebar
            spaceId={asSpaceId(page.spaceId)}
            activePageId={pageId}
            className="hidden px-3 py-4 lg:sticky lg:top-12 lg:block lg:self-start"
          />
          <PageReadingView
            page={page}
            pageId={pageId}
            space={space}
            isAuthenticated={isAuthenticated}
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
      />
    </HydrationBoundary>
  );
}
