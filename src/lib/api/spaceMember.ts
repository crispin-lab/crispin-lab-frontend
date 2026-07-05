import { apiFetch } from "./client";
import type { SpaceId, UserId } from "./ids";
import type {
  SpaceMemberJoinRequest,
  SpaceMemberJoinResult,
  SpaceMemberListResult,
  SpaceMemberRoleChangeRequest,
  SpaceMemberRoleChangeResult,
} from "./types";

export type SpaceMemberListParams = {
  page?: number;
  size?: number;
};

export function listSpaceMembers(
  spaceId: SpaceId,
  params: SpaceMemberListParams = {},
  signal?: AbortSignal,
): Promise<SpaceMemberListResult> {
  const search = buildListSpaceMembersQuery(params);
  const base = `/api/v1/spaces/${encodeURIComponent(spaceId)}/members`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetch<SpaceMemberListResult>(path, { signal });
}

export function joinSpaceMember(
  spaceId: SpaceId,
  body: SpaceMemberJoinRequest,
): Promise<SpaceMemberJoinResult> {
  return apiFetch<SpaceMemberJoinResult>(`/api/v1/spaces/${encodeURIComponent(spaceId)}/members`, {
    method: "POST",
    body,
  });
}

export function changeSpaceMemberRole(
  spaceId: SpaceId,
  userId: UserId,
  body: SpaceMemberRoleChangeRequest,
): Promise<SpaceMemberRoleChangeResult> {
  return apiFetch<SpaceMemberRoleChangeResult>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/members/${encodeURIComponent(userId)}`,
    { method: "PUT", body },
  );
}

export function removeSpaceMember(spaceId: SpaceId, userId: UserId): Promise<void> {
  return apiFetch<void>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

function buildListSpaceMembersQuery(params: SpaceMemberListParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
}
