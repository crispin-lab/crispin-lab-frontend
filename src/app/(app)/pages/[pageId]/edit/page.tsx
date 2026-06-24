import { notFound, redirect } from "next/navigation";

import { handleSsrAccessError } from "@/lib/api/access.server";
import { fetchMeServer } from "@/lib/api/auth.server";
import { asPageId } from "@/lib/api/ids";
import { fetchPageServer } from "@/lib/api/page.server";
import type { Page } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";

import { PageEditView } from "./_components/PageEditView";

export default async function PageEditRoute({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId: raw } = await params;
  const pageId = asPageId(raw);
  const returnPath = `/pages/${pageId}/edit`;

  // cookie 존재만으론 만료 세션을 못 거른다 — client mutation 들이 401 로 흩어지는 회귀를 SSR 한 곳에서 차단.
  const me = await fetchMeServer();
  if (me === null) {
    redirect(loginRedirectUrl(returnPath));
  }

  let page: Page;
  try {
    page = await fetchPageServer(pageId);
  } catch (error) {
    handleSsrAccessError(error, returnPath);
  }

  if (!page.canEdit) notFound();

  return <PageEditView pageId={pageId} initialPage={page} />;
}
