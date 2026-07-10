import type { SpaceId, UserId } from "@/lib/api/ids";
import type { Visibility } from "@/lib/page/visibility";
import type { SpaceVisibility } from "@/lib/space/visibility";

// 조립 지점 (Editor / CommentEditor) 이 하나라도 미로드면 null 을 반환하고, non-null 컨텍스트는 모든 필드가 확정.
export type MentionContext = {
  spaceId: SpaceId;
  spaceVisibility: SpaceVisibility;
  pageVisibility: Visibility;
  pageAuthorId: UserId;
};
