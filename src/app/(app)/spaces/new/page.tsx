import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginRedirectUrl } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { NewSpaceView } from "./_components/NewSpaceView";

export default async function NewSpaceRoute() {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)) {
    redirect(loginRedirectUrl("/spaces/new"));
  }

  return <NewSpaceView />;
}
