import { queryOptions } from "@tanstack/react-query";

import { fetchMe } from "../auth";
import type { ApiError } from "../client";
import type { Me } from "../types";

export const userKeys = {
  all: ["user"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

export function meOptions() {
  return queryOptions<Me | null, ApiError>({
    queryKey: userKeys.me(),
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 5 * 60_000,
  });
}
