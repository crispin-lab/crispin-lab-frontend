import { redirect } from "next/navigation";

import { fetchMeServer } from "@/lib/api/auth.server";
import { loginRedirectUrl } from "@/lib/auth/redirect";

import { NewSpaceView } from "./_components/NewSpaceView";

export default async function NewSpaceRoute() {
  // cookie 존재만으론 만료 세션을 못 거른다 — 유효성을 한 곳에서 확정.
  const me = await fetchMeServer();
  if (me === null) {
    redirect(loginRedirectUrl("/spaces/new"));
  }

  return <NewSpaceView />;
}
