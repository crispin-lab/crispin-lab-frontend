import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createQueryWrapper(client: QueryClient = createTestQueryClient()): {
  client: QueryClient;
  Wrapper: (props: { children: ReactNode }) => React.JSX.Element;
} {
  function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}
