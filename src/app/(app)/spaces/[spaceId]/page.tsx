import { cookies } from "next/headers";

import { asSpaceId } from "@/lib/api/ids";
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
  const isAuthenticated = cookieStore.get(SESSION_COOKIE_NAME) != null;

  return <SpaceDetailView spaceId={spaceId} isAuthenticated={isAuthenticated} />;
}
