import { apiFetch } from "./client";
import type { SpaceId } from "./ids";
import type { SpaceAuditEntryListResult } from "./types";

export type SpaceAuditLogParams = {
  page?: number;
  size?: number;
};

export function listSpaceAuditLog(
  spaceId: SpaceId,
  params: SpaceAuditLogParams = {},
  signal?: AbortSignal,
): Promise<SpaceAuditEntryListResult> {
  const search = buildQuery(params);
  const base = `/api/v1/spaces/${encodeURIComponent(spaceId)}/audit-entries`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetch<SpaceAuditEntryListResult>(path, { signal });
}

function buildQuery(params: SpaceAuditLogParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
}
