import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import type { SpaceId } from "../ids";
import { listSpaceAuditLog, type SpaceAuditLogParams } from "../spaceAudit";
import type { SpaceAuditEntryListResult } from "../types";

export const spaceAuditKeys = {
  all: ["spaceAudit"] as const,
  lists: () => [...spaceAuditKeys.all, "list"] as const,
  listBySpace: (spaceId: SpaceId) => [...spaceAuditKeys.lists(), spaceId] as const,
  list: (spaceId: SpaceId, params: SpaceAuditLogParams) =>
    [...spaceAuditKeys.listBySpace(spaceId), params] as const,
};

export function spaceAuditListOptions(spaceId: SpaceId, params: SpaceAuditLogParams = {}) {
  return queryOptions<SpaceAuditEntryListResult, ApiError>({
    queryKey: spaceAuditKeys.list(spaceId, params),
    queryFn: ({ signal }) => listSpaceAuditLog(spaceId, params, signal),
    staleTime: 30_000,
  });
}
