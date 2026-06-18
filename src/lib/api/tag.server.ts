import { apiFetchServer, type ApiServerOptions } from "./server";
import { buildPopularTagsQuery, type PopularTagsParams } from "./tag";
import type { PopularTagListResult } from "./types";

export function fetchPopularTagsServer(
  params: PopularTagsParams = {},
  options?: ApiServerOptions,
): Promise<PopularTagListResult> {
  const search = buildPopularTagsQuery(params);
  const path = search === "" ? "/v1/tags/popular" : `/v1/tags/popular?${search}`;
  return apiFetchServer<PopularTagListResult>(path, options);
}
