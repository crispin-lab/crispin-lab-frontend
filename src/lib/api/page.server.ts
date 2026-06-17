import type { PageId } from "./ids";
import {
  buildInboundLinksQuery,
  buildSearchPagesQuery,
  type PageInboundLinkParams,
  type PageSearchParams,
} from "./page";
import { apiFetchServer, type ApiServerOptions } from "./server";
import type { PageInboundLinkListResult, PageSearchResult } from "./types";

export function searchPagesServer(
  params: PageSearchParams,
  options?: ApiServerOptions,
): Promise<PageSearchResult> {
  const query = buildSearchPagesQuery(params);
  const path = query === "" ? "/v1/pages" : `/v1/pages?${query}`;
  return apiFetchServer<PageSearchResult>(path, options);
}

export function fetchInboundLinksServer(
  pageId: PageId,
  params: PageInboundLinkParams = {},
  options?: ApiServerOptions,
): Promise<PageInboundLinkListResult> {
  const qs = buildInboundLinksQuery(params);
  const path =
    qs === ""
      ? `/v1/pages/${encodeURIComponent(pageId)}/inbound`
      : `/v1/pages/${encodeURIComponent(pageId)}/inbound?${qs}`;
  return apiFetchServer<PageInboundLinkListResult>(path, options);
}
