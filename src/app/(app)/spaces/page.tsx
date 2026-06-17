import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { SpaceListView } from "./_components/SpaceListView";

export default async function SpacesRoute() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(SESSION_COOKIE_NAME) != null;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <SpaceListView isAuthenticated={isAuthenticated} />
    </main>
  );
}
