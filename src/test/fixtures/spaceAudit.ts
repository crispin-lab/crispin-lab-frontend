import type { SpaceAuditEntry, SpaceAuditEntryListResult } from "@/lib/api/types";

export function spaceAuditEntry(overrides: Partial<SpaceAuditEntry> = {}): SpaceAuditEntry {
  return {
    id: "sae_1",
    actorUserId: "u_01HXTEST00000000FIXTURE0",
    actorHandle: "tester",
    action: "EDITED",
    changeSummary: JSON.stringify({
      name: { before: "예전 이름", after: "새 이름" },
    }),
    createdAt: "2026-07-01T14:32:00Z",
    ...overrides,
  };
}

export function spaceAuditListBody(
  items: SpaceAuditEntry[] = [spaceAuditEntry()],
  overrides: Partial<SpaceAuditEntryListResult> = {},
): SpaceAuditEntryListResult {
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
