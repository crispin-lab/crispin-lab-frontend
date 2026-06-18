import { hasSessionCookie } from "@/lib/auth/session";

import { SpaceListView } from "./_components/SpaceListView";

export default async function SpacesRoute() {
  const isAuthenticated = await hasSessionCookie();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <SpaceListView isAuthenticated={isAuthenticated} />
    </main>
  );
}
