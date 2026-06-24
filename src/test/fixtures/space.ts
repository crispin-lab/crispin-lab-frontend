import type { Space } from "@/lib/api/types";

export function spaceBody(overrides: Partial<Space> = {}): Space {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    name: "테스트 스페이스",
    description: "",
    updatedAt: "2026-01-01T00:00:00Z",
    canWrite: true,
    ...overrides,
  };
}
