// 백엔드 PageRegisterRequest.visibility 는 string 으로 와 있지만 실제 허용값은 DRAFT / INTERNAL / PUBLIC.
export const VISIBILITY_VALUES = ["DRAFT", "INTERNAL", "PUBLIC"] as const;

export type Visibility = (typeof VISIBILITY_VALUES)[number];

const VISIBILITY_LABEL: Record<Visibility, string> = {
  DRAFT: "초안",
  INTERNAL: "비공개",
  PUBLIC: "공개",
};

const VISIBILITY_DESCRIPTION: Record<Visibility, string> = {
  DRAFT: "본인만 볼 수 있는 작성 중인 페이지",
  INTERNAL: "로그인한 사용자에게만 공개",
  PUBLIC: "누구나 볼 수 있는 공개 페이지",
};

export function visibilityLabel(value: Visibility): string {
  return VISIBILITY_LABEL[value];
}

export function visibilityDescription(value: Visibility): string {
  return VISIBILITY_DESCRIPTION[value];
}

export function isVisibility(value: string): value is Visibility {
  return (VISIBILITY_VALUES as readonly string[]).includes(value);
}
