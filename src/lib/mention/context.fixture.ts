import { asSpaceId, asUserId } from "@/lib/api/ids";

import type { MentionContext } from "./context";

// 세 테스트 (`lib/api/mention.test.ts`, `editor/extensions/mention/suggestion.test.ts`,
// `editor/MentionUserList.test.tsx`) 가 같은 MentionContext 골격을 반복 정의해 필드 변경 시 다중 갱신
// 부담이 있어 공용 fixture 로 승격. 사용처가 두 곳 이상이라 인라인보다 함수 추출이 정합 (`conventions.md` 정신).
export function mentionContextFixture(overrides: Partial<MentionContext> = {}): MentionContext {
  return {
    spaceId: asSpaceId("s_1"),
    spaceVisibility: "PUBLIC",
    pageVisibility: "PUBLIC",
    pageAuthorId: asUserId("u_author"),
    ...overrides,
  };
}
