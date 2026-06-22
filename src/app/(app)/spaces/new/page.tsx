import { redirect } from "next/navigation";

import { fetchMeServer } from "@/lib/api/auth.server";
import { loginRedirectUrl } from "@/lib/auth/redirect";

import { NewSpaceView } from "./_components/NewSpaceView";

// 사용자별 인증 결과라 prerender 의미 없음 — 빌드 시 BACKEND_URL 없는 환경에서도 통과해야 한다.
export const dynamic = "force-dynamic";

export default async function NewSpaceRoute() {
  // cookie 존재만으론 만료 세션을 못 거른다 — 유효성을 한 곳에서 확정.
  const me = await fetchMeServer();
  if (me === null) {
    redirect(loginRedirectUrl("/spaces/new"));
  }

  return <NewSpaceView />;
}
