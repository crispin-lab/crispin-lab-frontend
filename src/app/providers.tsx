"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { Toaster } from "@/components/ui/sonner";
import { handleMutationError, handleQueryError } from "@/lib/api/queryErrorHandlers";
import { queryDefaultOptions } from "@/lib/queryClient";

function makeBrowserQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleQueryError }),
    mutationCache: new MutationCache({ onError: handleMutationError }),
    defaultOptions: queryDefaultOptions,
  });
}

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = useState(() => makeBrowserQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors closeButton position="top-right" />
      {process.env.NODE_ENV !== "production" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
