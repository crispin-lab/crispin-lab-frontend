import { handleSsrAccessError } from "@/lib/api/access.server";
import { asSpaceId } from "@/lib/api/ids";
import { fetchSpaceServer } from "@/lib/api/space.server";
import type { Space } from "@/lib/api/types";
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

  let space: Space;
  try {
    space = await fetchSpaceServer(spaceId, { allowAnonymousFallback: true });
  } catch (error) {
    handleSsrAccessError(error, `/spaces/${spaceId}`);
  }

  return (
    <SpaceDetailView spaceId={spaceId} isAuthenticated={isAuthenticated} initialSpace={space} />
  );
}
