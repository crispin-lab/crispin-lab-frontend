"use client";

import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import type { SpaceId } from "@/lib/api/ids";
import { spaceAuditListOptions } from "@/lib/api/queries/spaceAudit";
import { type SpaceAuditLogParams } from "@/lib/api/spaceAudit";
import type { SpaceAuditEntryListResult } from "@/lib/api/types";

type QueryOverrides<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, "queryKey" | "queryFn">;

export function useSpaceAuditLog(
  spaceId: SpaceId,
  params: SpaceAuditLogParams = {},
  overrides?: QueryOverrides<SpaceAuditEntryListResult>,
): UseQueryResult<SpaceAuditEntryListResult, ApiError> {
  return useQuery({ ...spaceAuditListOptions(spaceId, params), ...overrides });
}
