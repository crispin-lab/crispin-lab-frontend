import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { asSpaceId } from "@/lib/api/ids";
import { loginRedirectUrl } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { SpaceDetailView } from "./_components/SpaceDetailView";

export default async function SpaceDetailRoute({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId: raw } = await params;
  const spaceId = asSpaceId(raw);

  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)) {
    redirect(loginRedirectUrl(`/spaces/${encodeURIComponent(spaceId)}`));
  }

  return <SpaceDetailView spaceId={spaceId} />;
}
