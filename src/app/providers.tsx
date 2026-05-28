"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    // 등록된 onError 는 query 의 error propagation 을 막지 않는다 — 빈 함수로 두면 컴포넌트가 그대로 error 상태를 받는다.
    queryCache: new QueryCache({
      onError: () => {
        /*
        todo    :: 401 (INVALID_SESSION) 응답이면 /login redirect + toast 를 트리거한다.
         author :: crispin
         date   :: 2026-05-27T00:00:00KST
         ticket :: LAB-57
         */
      },
    }),
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
