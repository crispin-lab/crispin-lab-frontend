import { notFound, redirect } from "next/navigation";

import { handleSsrAccessError } from "@/lib/api/access.server";
import { fetchMeServer } from "@/lib/api/auth.server";
import { asSpaceId } from "@/lib/api/ids";
import { fetchSpaceServer } from "@/lib/api/space.server";
import type { Space } from "@/lib/api/types";
import { loginRedirectUrl } from "@/lib/auth/redirect";

import { SpaceEditView } from "./_components/SpaceEditView";

export default async function SpaceEditRoute({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId: raw } = await params;
  const spaceId = asSpaceId(raw);
  const returnPath = `/spaces/${spaceId}/edit`;

  // cookie 존재만으론 만료 세션을 못 거른다 — client mutation 들이 401 로 흩어지는 회귀를 SSR 한 곳에서 차단.
  const me = await fetchMeServer();
  if (me === null) {
    redirect(loginRedirectUrl(returnPath));
  }

  let space: Space;
  try {
    space = await fetchSpaceServer(spaceId);
  } catch (error) {
    handleSsrAccessError(error, returnPath);
  }

  if (!space.canEdit) notFound();

  return <SpaceEditView spaceId={spaceId} initialSpace={space} />;
}
