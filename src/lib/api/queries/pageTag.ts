import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { PageId } from "../ids";
import { fetchPageTagList, type PageTagListParams } from "../pageTag";
import type { PageTagListResult } from "../types";

export const pageTagKeys = {
  all: ["pageTag"] as const,
  lists: () => [...pageTagKeys.all, "list"] as const,
  list: (pageId: PageId, params: PageTagListParams = {}) =>
    [...pageTagKeys.lists(), pageId, params] as const,
};

export function pageTagListOptions(pageId: PageId, params: PageTagListParams = {}) {
  return queryOptions<PageTagListResult, ApiError>({
    queryKey: pageTagKeys.list(pageId, params),
    queryFn: ({ signal }) => fetchPageTagList(pageId, params, signal),
  });
}
