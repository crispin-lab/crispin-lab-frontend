import type { PageId, SpaceId } from "../ids";

export const pageKeys = {
  all: ["page"] as const,
  lists: () => [...pageKeys.all, "list"] as const,
  list: (spaceId: SpaceId) => [...pageKeys.lists(), spaceId] as const,
  details: () => [...pageKeys.all, "detail"] as const,
  detail: (pageId: PageId) => [...pageKeys.details(), pageId] as const,
};
