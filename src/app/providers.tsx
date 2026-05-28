"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { redirectToLogin } from "@/lib/auth/redirect";

function isInvalidSession(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === "INVALID_SESSION";
}

function handleError(error: unknown): void {
  if (isInvalidSession(error)) {
    redirectToLogin();
  }
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    // 등록된 onError 는 query 의 error propagation 을 막지 않는다 — 컴포넌트는 그대로 error 상태를 받는다.
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
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
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV !== "production" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
