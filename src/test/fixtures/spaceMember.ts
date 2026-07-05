import type { SpaceMemberListResult, SpaceMemberSummary } from "@/lib/api/types";

export function spaceMemberSummary(
  overrides: Partial<SpaceMemberSummary> = {},
): SpaceMemberSummary {
  return {
    spaceMemberId: "sm_1",
    spaceId: "s_1",
    userId: "u_01HXTEST00000000FIXTURE0",
    role: "OWNER",
    handle: "tester",
    joinedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function spaceMemberListBody(
  items: SpaceMemberSummary[] = [spaceMemberSummary()],
  overrides: Partial<SpaceMemberListResult> = {},
): SpaceMemberListResult {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
    ...overrides,
  };
}
