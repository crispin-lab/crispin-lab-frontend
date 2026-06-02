// 백엔드 SpaceRegisterRequest.visibility 는 string 으로 와 있지만 실제 허용값은 PUBLIC / INTERNAL.
// (DRAFT 는 Page 전용 — 스페이스 자체는 초안 상태가 없다.)
export const SPACE_VISIBILITY_VALUES = ["PUBLIC", "INTERNAL"] as const;

export type SpaceVisibility = (typeof SPACE_VISIBILITY_VALUES)[number];

const SPACE_VISIBILITY_LABEL: Record<SpaceVisibility, string> = {
  PUBLIC: "공개",
  INTERNAL: "비공개",
};

const SPACE_VISIBILITY_DESCRIPTION: Record<SpaceVisibility, string> = {
  PUBLIC: "누구나 볼 수 있는 공개 스페이스",
  INTERNAL: "로그인한 사용자에게만 공개되는 스페이스",
};

export function spaceVisibilityLabel(value: string): string {
  if (isSpaceVisibility(value)) return SPACE_VISIBILITY_LABEL[value];
  // 백엔드가 새 visibility 값을 도입했을 때 raw enum 문자열을 사용자에게 노출하지 않게 fallback.
  return "알 수 없음";
}

export function spaceVisibilityDescription(value: SpaceVisibility): string {
  return SPACE_VISIBILITY_DESCRIPTION[value];
}

export function isSpaceVisibility(value: unknown): value is SpaceVisibility {
  return (
    typeof value === "string" && (SPACE_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}
