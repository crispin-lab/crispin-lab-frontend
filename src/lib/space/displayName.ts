import type { Space } from "@/lib/api/types";

// BE 가 이름 없는 스페이스를 빈 문자열로 내려보낸다는 계약을 컴포넌트마다 분기하지 않게 한 곳에 모음 — `ui.md` "도메인 fallback 라벨" 정합.
export const SPACE_NAME_FALLBACK = "이름 없는 스페이스";

export type SpaceDisplayName = {
  text: string;
  isFallback: boolean;
};

export function spaceDisplayName(space: Pick<Space, "name">): SpaceDisplayName {
  if (space.name === "") return { text: SPACE_NAME_FALLBACK, isFallback: true };
  return { text: space.name, isFallback: false };
}
