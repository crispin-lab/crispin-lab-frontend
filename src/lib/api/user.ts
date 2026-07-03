import { apiFetch } from "./client";
import { asUserId } from "./ids";
import type { UserComponents, UserSearchResult } from "./types";

export type UserSearchParams = {
  query: string;
  size?: number;
};

type RawUserSearchResponse = UserComponents["schemas"]["UserSearchResponse"];

export async function searchUsers(
  params: UserSearchParams,
  signal?: AbortSignal,
): Promise<UserSearchResult> {
  const search = buildSearchUsersQuery(params);
  const path = search === "" ? "/api/v1/users" : `/api/v1/users?${search}`;
  const raw = await apiFetch<RawUserSearchResponse>(path, { signal });
  return {
    items: raw.items.map((item) => ({
      userId: asUserId(item.userId),
      handle: item.handle,
    })),
  };
}

export function buildSearchUsersQuery(params: UserSearchParams): string {
  const search = new URLSearchParams();
  if (params.query !== "") {
    search.append("query", params.query);
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
}
