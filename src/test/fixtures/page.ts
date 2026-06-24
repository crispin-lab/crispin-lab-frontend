import type { Page } from "@/lib/api/types";

export function pageBody(overrides: Partial<Page> = {}): Page {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: null,
    displayOrder: 0,
    ancestors: [],
    title: "원본 제목",
    authorHandle: "tester",
    authorId: "u_01HXTEST00000000FIXTURE0",
    pageId: "p_1",
    currentVersion: 3,
    content: "본문 raw",
    updatedAt: "2026-05-26T05:32:00Z",
    canEdit: false,
    ...overrides,
  };
}
