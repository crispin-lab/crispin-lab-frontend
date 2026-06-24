import { notFound, redirect } from "next/navigation";

import { loginRedirectUrl } from "@/lib/auth/redirect";

import { ApiError } from "./client";

export function handleSsrAccessError(error: unknown, returnPath: string): never {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(loginRedirectUrl(returnPath));
    if (error.status === 403 || error.status === 404) notFound();
  }
  throw error;
}
