import { type DefaultOptions, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";

// Server prefetch 와 Client Provider 가 공유해야 hydrate 후 깜빡임이 없다.
export const queryDefaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
  },
};

export function makeServerQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: queryDefaultOptions });
}
