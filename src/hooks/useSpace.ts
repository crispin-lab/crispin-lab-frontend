import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import { spaceKeys, spaceListOptions } from "@/lib/api/queries/space";
import { createSpace, type SpaceListParams } from "@/lib/api/space";
import type { SpaceCreateRequest, SpaceCreateResult, SpaceListResult } from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function useSpaceList(
  params: SpaceListParams = {},
  overrides?: QueryOverrides<SpaceListResult>,
): UseQueryResult<SpaceListResult, ApiError> {
  return useQuery({ ...spaceListOptions(params), ...overrides });
}

export function useSpaceCreate(): UseMutationResult<
  SpaceCreateResult,
  ApiError,
  SpaceCreateRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createSpace(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
    },
  });
}
