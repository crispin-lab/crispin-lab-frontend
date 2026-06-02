import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { asPageId } from "@/lib/api/ids";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { PageEditView } from "./_components/PageEditView";

export default async function PageEditRoute({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;

  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)) {
    redirect(loginRedirectUrl(`/pages/${pageId}`));
  }

  return <PageEditView pageId={asPageId(pageId)} />;
}
