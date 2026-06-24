import { notFound, redirect } from "next/navigation";

import { handleSsrAccessError } from "@/lib/api/access.server";
import { fetchMeServer } from "@/lib/api/auth.server";
import { asSpaceId } from "@/lib/api/ids";
import { fetchSpaceServer } from "@/lib/api/space.server";
import type { Space } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";

import { NewPageView } from "./_components/NewPageView";

// 사용자별 인증 결과라 prerender 의미 없음 — 빌드 시 BACKEND_URL 없는 환경에서도 통과해야 한다.
export const dynamic = "force-dynamic";

export default async function NewPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  const { spaceId } = await searchParams;

  // cookie 존재만으론 만료 세션을 못 거른다 — 유효성을 한 곳에서 확정.
  const me = await fetchMeServer();
  if (me === null) {
    const target = spaceId
      ? `/pages/new?${new URLSearchParams({ spaceId }).toString()}`
      : "/pages/new";
    redirect(loginRedirectUrl(target));
  }

  if (!spaceId) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-3 px-6 py-10">
        <h1 className="text-2xl font-semibold">새 페이지를 만들 스페이스를 선택해 주세요.</h1>
        <p className="text-muted-foreground text-sm">
          스페이스 화면에서 새 페이지 만들기를 다시 눌러 주세요.
        </p>
      </main>
    );
  }

  const returnPath = `/pages/new?${new URLSearchParams({ spaceId }).toString()}`;
  let space: Space;
  try {
    space = await fetchSpaceServer(asSpaceId(spaceId));
  } catch (error) {
    handleSsrAccessError(error, returnPath);
  }
  if (!space.canWrite) notFound();

  return <NewPageView spaceId={asSpaceId(spaceId)} />;
}
