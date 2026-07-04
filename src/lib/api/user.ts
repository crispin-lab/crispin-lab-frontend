import { apiFetch } from "./client";
import { asSpaceId, asUserId } from "./ids";
import type { CompositionComponents, UserSearchResult } from "./types";

export type UserSearchParams = {
  query: string;
  size?: number;
};

// LAB-150 이후 endpoint 가 lab-composition BFF 로 이관. 응답 각 항목에 `memberOfSpaceIds` (검색자가 볼 수 있는
// 스페이스만 노출) 가 실린다. 초대 dialog 가 이미 참여 중인 사용자를 필터링하는 근거.
type RawUserSearchResponse = CompositionComponents["schemas"]["UserSearchResponse"];

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
      memberOfSpaceIds: item.memberOfSpaceIds
        .filter((value): value is string => typeof value === "string")
        .map((raw) => asSpaceId(raw)),
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
