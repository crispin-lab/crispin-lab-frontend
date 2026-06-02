// DRAFT 는 Page 전용 — 백엔드 SpaceRegisterRequest 가 거부.
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
