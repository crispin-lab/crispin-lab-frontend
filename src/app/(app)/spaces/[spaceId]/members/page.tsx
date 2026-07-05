import { redirect } from "next/navigation";

import { handleSsrAccessError } from "@/lib/api/access.server";
import { asSpaceId } from "@/lib/api/ids";
import { fetchSpaceServer } from "@/lib/api/space.server";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { hasSessionCookie } from "@/lib/auth/session";

import { SpaceMembersView } from "./_components/SpaceMembersView";

// 사용자별 인증 결과라 prerender 의미 없음.
export const dynamic = "force-dynamic";

export default async function SpaceMembersRoute({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId: raw } = await params;
  const spaceId = asSpaceId(raw);
  const isAuthenticated = await hasSessionCookie();
  if (!isAuthenticated) {
    redirect(loginRedirectUrl(`/spaces/${spaceId}/members`));
  }

  // 존재/권한 검증 전용 fetch — SSR prefetch + hydrate 는 후속 최적화 티켓.
  try {
    await fetchSpaceServer(spaceId, { allowAnonymousFallback: false });
  } catch (error) {
    handleSsrAccessError(error, `/spaces/${spaceId}/members`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <SpaceMembersView spaceId={spaceId} />
    </main>
  );
}
