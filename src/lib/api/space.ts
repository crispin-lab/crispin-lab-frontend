import { apiFetch } from "./client";
import type { SpaceId } from "./ids";
import type {
  Space,
  SpaceCreateRequest,
  SpaceCreateResult,
  SpaceEditRequest,
  SpaceEditResult,
  SpaceListResult,
  SpaceSortKey,
  SortDirection,
} from "./types";

export type SpaceListParams = {
  keyword?: string;
  sort?: SpaceSortKey;
  direction?: SortDirection;
  page?: number;
  size?: number;
};

export function fetchSpace(spaceId: SpaceId, signal?: AbortSignal): Promise<Space> {
  return apiFetch<Space>(`/api/v1/spaces/${encodeURIComponent(spaceId)}`, { signal });
}

export function listSpaces(
  params: SpaceListParams = {},
  signal?: AbortSignal,
): Promise<SpaceListResult> {
  const search = buildListSpacesQuery(params);
  const path = search === "" ? "/api/v1/spaces" : `/api/v1/spaces?${search}`;
  return apiFetch<SpaceListResult>(path, { signal });
}

export function createSpace(body: SpaceCreateRequest): Promise<SpaceCreateResult> {
  return apiFetch<SpaceCreateResult>("/api/v1/spaces", {
    method: "POST",
    body,
  });
}

export function editSpace(spaceId: SpaceId, body: SpaceEditRequest): Promise<SpaceEditResult> {
  return apiFetch<SpaceEditResult>(`/api/v1/spaces/${encodeURIComponent(spaceId)}`, {
    method: "PUT",
    body,
  });
}

export function deleteSpace(spaceId: SpaceId): Promise<void> {
  return apiFetch<void>(`/api/v1/spaces/${encodeURIComponent(spaceId)}`, {
    method: "DELETE",
  });
}

export function buildListSpacesQuery(params: SpaceListParams): string {
  const search = new URLSearchParams();
  if (params.keyword !== undefined && params.keyword.trim() !== "") {
    search.append("keyword", params.keyword.trim());
  }
  if (params.sort !== undefined) {
    search.append("sort", params.sort);
  }
  if (params.direction !== undefined) {
    search.append("direction", params.direction);
  }
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
}
