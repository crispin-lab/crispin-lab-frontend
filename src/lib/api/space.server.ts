import type { SpaceId } from "./ids";
import { apiFetchServer, type ApiServerOptions } from "./server";
import { buildListSpacesQuery, type SpaceListParams } from "./space";
import type { Space, SpaceListResult } from "./types";

export function fetchSpaceServer(spaceId: SpaceId, options?: ApiServerOptions): Promise<Space> {
  return apiFetchServer<Space>(`/v1/spaces/${encodeURIComponent(spaceId)}`, options);
}

export function listSpacesServer(
  params: SpaceListParams = {},
  options?: ApiServerOptions,
): Promise<SpaceListResult> {
  const search = buildListSpacesQuery(params);
  const path = search === "" ? "/v1/spaces" : `/v1/spaces?${search}`;
  return apiFetchServer<SpaceListResult>(path, options);
}
