import type { PageId } from "./ids";
import { buildSearchPagesQuery, type PageInboundLinkParams, type PageSearchParams } from "./page";
import { apiFetchServer, type ApiServerOptions } from "./server";
import type { PageInboundLinkList, PageSearchResult } from "./types";

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
): Promise<PageInboundLinkList> {
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  const qs = search.toString();
  const path =
    qs === ""
      ? `/v1/pages/${encodeURIComponent(pageId)}/inbound`
      : `/v1/pages/${encodeURIComponent(pageId)}/inbound?${qs}`;
  return apiFetchServer<PageInboundLinkList>(path, options);
}
