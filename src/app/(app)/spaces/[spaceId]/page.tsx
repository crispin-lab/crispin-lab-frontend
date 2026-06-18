import { asSpaceId } from "@/lib/api/ids";
import { hasSessionCookie } from "@/lib/auth/session";

import { SpaceDetailView } from "./_components/SpaceDetailView";

export default async function SpaceDetailRoute({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId: raw } = await params;
  const spaceId = asSpaceId(raw);
  const isAuthenticated = await hasSessionCookie();

  return <SpaceDetailView spaceId={spaceId} isAuthenticated={isAuthenticated} />;
}
