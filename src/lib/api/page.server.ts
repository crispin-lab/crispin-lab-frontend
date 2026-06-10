import { buildSearchPagesQuery, type PageSearchParams } from "./page";
import { apiFetchServer, type ApiServerOptions } from "./server";
import type { PageSearchResult } from "./types";

export function searchPagesServer(
  params: PageSearchParams,
  options?: ApiServerOptions,
): Promise<PageSearchResult> {
  const query = buildSearchPagesQuery(params);
  const path = query === "" ? "/v1/pages" : `/v1/pages?${query}`;
  return apiFetchServer<PageSearchResult>(path, options);
}
