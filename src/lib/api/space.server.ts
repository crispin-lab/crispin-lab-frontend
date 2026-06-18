import type { SpaceId } from "./ids";
import { apiFetchServer, type ApiServerOptions } from "./server";
import type { Space } from "./types";

export function fetchSpaceServer(spaceId: SpaceId, options?: ApiServerOptions): Promise<Space> {
  return apiFetchServer<Space>(`/v1/spaces/${encodeURIComponent(spaceId)}`, options);
}
