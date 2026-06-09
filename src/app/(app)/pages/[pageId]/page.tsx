import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PageTreeSidebar } from "@/components/page/PageTreeSidebar";
import { ApiError } from "@/lib/api/client";
import { asPageId, asSpaceId } from "@/lib/api/ids";
import { apiFetchServer } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

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

  // grid 골격은 이 라우트 한정 — layout.tsx 에 두면 [pageId]/edit 서브라우트까지 적용돼 편집 화면 폭이 깨진다.
  // sticky top 은 AppHeader 의 h-12 와 정합.
  if (isAuthenticated) {
    return (
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <PageTreeSidebar
          spaceId={asSpaceId(page.spaceId)}
          activePageId={pageId}
          className="hidden px-3 py-4 lg:sticky lg:top-12 lg:block lg:self-start"
        />
        <PageReadingView page={page} isAuthenticated={isAuthenticated} />
      </div>
    );
  }

  return <PageReadingView page={page} isAuthenticated={isAuthenticated} />;
}
