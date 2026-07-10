import { notFound, redirect } from "next/navigation";

import { handleSsrAccessError } from "@/lib/api/access.server";
import { asSpaceId } from "@/lib/api/ids";
import { fetchSpaceServer } from "@/lib/api/space.server";
import type { Space } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { hasSessionCookie } from "@/lib/auth/session";

import { SpaceAuditLogView } from "./_components/SpaceAuditLogView";

// 사용자별 인증 결과라 prerender 의미 없음.
export const dynamic = "force-dynamic";

export default async function SpaceAuditLogRoute({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId: raw } = await params;
  const spaceId = asSpaceId(raw);
  const isAuthenticated = await hasSessionCookie();
  if (!isAuthenticated) {
    redirect(loginRedirectUrl(`/spaces/${spaceId}/audit-log`));
  }

  let space: Space;
  try {
    space = await fetchSpaceServer(spaceId, { allowAnonymousFallback: false });
  } catch (error) {
    handleSsrAccessError(error, `/spaces/${spaceId}/audit-log`);
  }

  // audit 조회 권한 = 편집 권한 (LAB-169). canEdit 미보유 사용자에게는 존재 자체를 노출하지 않는다.
  if (!space.canEdit) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <SpaceAuditLogView spaceId={spaceId} space={space} />
    </main>
  );
}
