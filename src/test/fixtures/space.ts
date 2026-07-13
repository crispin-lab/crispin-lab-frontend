import type { Space, SpaceSummary } from "@/lib/api/types";

export function spaceBody(overrides: Partial<Space> = {}): Space {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    name: "테스트 스페이스",
    description: "",
    updatedAt: "2026-01-01T00:00:00Z",
    canWrite: true,
    canEdit: false,
    ...overrides,
  };
}

export function spaceSummary(overrides: Partial<SpaceSummary> = {}): SpaceSummary {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    name: "테스트 스페이스",
    description: "",
    updatedAt: "2026-01-01T00:00:00Z",
    pageCount: 0,
    memberCount: 0,
    myRole: "MEMBER",
    lastActivityAt: "2026-01-01T00:00:00Z",
    unreadCount: 0,
    ...overrides,
  };
}

// openapi-typescript 는 optional 만 표기하지만 BE 는 null 도 내림 — 캐스팅을 이 helper 한 곳에 격리.
export function spaceSummaryWithNullLatestPage(
  overrides: Partial<SpaceSummary> = {},
): SpaceSummary {
  return {
    ...spaceSummary(overrides),
    latestPage: null as unknown as SpaceSummary["latestPage"],
  };
}
