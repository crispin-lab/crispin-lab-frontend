import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PageTreeSidebar } from "@/components/page/PageTreeSidebar";
import { ApiError } from "@/lib/api/client";
import { asPageId, asSpaceId } from "@/lib/api/ids";
import { INBOUND_LIST_SIZE } from "@/lib/api/page";
import { fetchInboundLinksServer } from "@/lib/api/page.server";
import { pageInboundLinksOptions } from "@/lib/api/queries/page";
import { apiFetchServer } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { makeServerQueryClient } from "@/lib/queryClient";

import { PageReadingView } from "./_components/PageReadingView";

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
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(loginRedirectUrl(`/pages/${pageId}`));
      }
      if (error.status === 403 || error.status === 404) {
        notFound();
      }
    }
    throw error;
  }

  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(SESSION_COOKIE_NAME) != null;

  // 인바운드 link 는 reading 화면 본문 외 정보. prefetchQuery 는 throw 하지 않고 내부에서 에러를 swallow 하므로
  // 실패해도 본 페이지 reading 은 그대로. Client 의 useQuery 가 다시 시도하거나 ErrorRetryCard 가 받는다.
  // anonymous 면 BE 가 PUBLIC source 만 반환 — visibility 분기는 BE 가 인증 컨텍스트로 처리.
  const queryClient = makeServerQueryClient();
  const inboundParams = { size: INBOUND_LIST_SIZE };
  await queryClient.prefetchQuery({
    ...pageInboundLinksOptions(pageId, inboundParams),
    queryFn: () => fetchInboundLinksServer(pageId, inboundParams, { allowAnonymousFallback: true }),
  });

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
          <PageReadingView page={page} pageId={pageId} isAuthenticated={isAuthenticated} />
        </div>
      </HydrationBoundary>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageReadingView page={page} pageId={pageId} isAuthenticated={isAuthenticated} />
    </HydrationBoundary>
  );
}
