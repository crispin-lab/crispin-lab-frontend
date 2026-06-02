import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { asSpaceId } from "@/lib/api/ids";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { NewPageView } from "./_components/NewPageView";

export default async function NewPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  const { spaceId } = await searchParams;

  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)) {
    const target = spaceId
      ? `/pages/new?${new URLSearchParams({ spaceId }).toString()}`
      : "/pages/new";
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
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

  return <NewPageView spaceId={asSpaceId(spaceId)} />;
}
