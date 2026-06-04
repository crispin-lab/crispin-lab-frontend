import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { asPageId } from "@/lib/api/ids";
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
      if (error.status === 403 || error.status === 404) notFound();
    }
    throw error;
  }

  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(SESSION_COOKIE_NAME) != null;

  return <PageReadingView page={page} isAuthenticated={isAuthenticated} />;
}
