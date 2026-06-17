import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { PageId } from "@/lib/api/ids";
import type { PageInboundLinkParams } from "@/lib/api/page";
import { pageInboundLinksOptions } from "@/lib/api/queries/page";
import type { PageInboundLinkList } from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function usePageInboundLinks(
  pageId: PageId,
  params: PageInboundLinkParams = {},
  overrides?: QueryOverrides<PageInboundLinkList>,
): UseQueryResult<PageInboundLinkList, ApiError> {
  return useQuery({ ...pageInboundLinksOptions(pageId, params), ...overrides });
}
