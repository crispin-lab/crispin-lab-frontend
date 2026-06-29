import { infiniteQueryOptions } from "@tanstack/react-query";

import { type CommentListParams, listComments } from "../comment";
import type { PageId } from "../ids";
import type { CommentListResult } from "../types";

export const commentKeys = {
  all: ["comment"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (pageId: PageId, params: CommentListParams = {}) =>
    [...commentKeys.lists(), pageId, params] as const,
  pageLists: (pageId: PageId) => [...commentKeys.lists(), pageId] as const,
};

type CommentInfiniteParams = Omit<CommentListParams, "page">;

export function commentListOptions(pageId: PageId, params: CommentInfiniteParams = {}) {
  return infiniteQueryOptions({
    queryKey: commentKeys.list(pageId, params),
    queryFn: ({ pageParam, signal }): Promise<CommentListResult> =>
      listComments(pageId, { ...params, page: pageParam }, signal),
    initialPageParam: 0,
    // BE 가 hasNext 를 단일 신호로 내려준다 — totalPages 비교는 BE 정책 변화에 깨질 수 있어 hasNext 만 본다.
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // 댓글은 실시간성 — 다른 사용자 등록이 빠르게 반영되도록 always stale.
    staleTime: 0,
  });
}
