import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginRedirectUrl } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { SpaceListView } from "./_components/SpaceListView";

export default async function SpacesRoute() {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)) {
    redirect(loginRedirectUrl("/spaces"));
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <SpaceListView />
    </main>
  );
}
