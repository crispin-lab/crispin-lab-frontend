import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import {
  type CommentListParams,
  deleteComment,
  editComment,
  registerComment,
} from "@/lib/api/comment";
import type { CommentId, PageId } from "@/lib/api/ids";
import { commentKeys, commentListOptions } from "@/lib/api/queries/comment";
import type {
  CommentEditRequest,
  CommentEditResult,
  CommentListResult,
  CommentRegisterRequest,
  CommentRegisterResult,
} from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function useCommentList(
  pageId: PageId,
  params: CommentListParams = {},
  overrides?: QueryOverrides<CommentListResult>,
): UseQueryResult<CommentListResult, ApiError> {
  return useQuery({ ...commentListOptions(pageId, params), ...overrides });
}

export function useCommentRegister(
  pageId: PageId,
): UseMutationResult<CommentRegisterResult, ApiError, CommentRegisterRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => registerComment(pageId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.pageLists(pageId) });
    },
  });
}

export function useCommentEdit(
  pageId: PageId,
  commentId: CommentId,
): UseMutationResult<CommentEditResult, ApiError, CommentEditRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => editComment(pageId, commentId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.pageLists(pageId) });
    },
  });
}

export function useCommentDelete(pageId: PageId): UseMutationResult<void, ApiError, CommentId> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => deleteComment(pageId, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.pageLists(pageId) });
    },
  });
}
