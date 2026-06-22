import { redirect } from "next/navigation";

import { fetchMeServer } from "@/lib/api/auth.server";
import { asPageId } from "@/lib/api/ids";
import { loginRedirectUrl } from "@/lib/auth/redirect";

import { PageEditView } from "./_components/PageEditView";

export default async function PageEditRoute({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;

  // cookie 존재만으론 만료 세션을 못 거른다 — client mutation 들이 401 로 흩어지는 회귀를 SSR 한 곳에서 차단.
  const me = await fetchMeServer();
  if (me === null) {
    redirect(loginRedirectUrl(`/pages/${pageId}/edit`));
  }

  return <PageEditView pageId={asPageId(pageId)} />;
}
