// 백엔드 PageRegisterRequest.visibility 는 string 으로 와 있지만 실제 허용값은
// DRAFT / INTERNAL / MEMBER / PUBLIC — `isVisibility` 가드로 좁힌다.
export const VISIBILITY_VALUES = ["DRAFT", "INTERNAL", "MEMBER", "PUBLIC"] as const;

export type Visibility = (typeof VISIBILITY_VALUES)[number];

const VISIBILITY_LABEL: Record<Visibility, string> = {
  DRAFT: "초안",
  INTERNAL: "비공개",
  MEMBER: "멤버 공개",
  PUBLIC: "공개",
};

const VISIBILITY_DESCRIPTION: Record<Visibility, string> = {
  DRAFT: "본인만 볼 수 있는 작성 중인 페이지",
  INTERNAL: "본인만 볼 수 있는 완성된 페이지",
  MEMBER: "스페이스 멤버에게만 공개",
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

const VISIBILITY_RANK: Record<Visibility, number> = {
  DRAFT: 0,
  INTERNAL: 1,
  MEMBER: 2,
  PUBLIC: 3,
};

export function isVisibilityNarrowerThan(target: Visibility, source: Visibility): boolean {
  return VISIBILITY_RANK[target] < VISIBILITY_RANK[source];
}

// 백엔드 PageLink displayText 마스킹 라벨과 정확히 일치해야 한다 — backend schema 의
// `PageGetResponse.content` 설명이 동일 문구 ('비공개 페이지') 를 약속한다.
export function buildNarrowerVisibilityWarning(target: Visibility, source: Visibility): string {
  return `이 페이지는 ${visibilityLabel(target)} 페이지입니다. ${visibilityLabel(source)} 페이지를 보는 일부 독자에게는 '비공개 페이지' 로 표시됩니다.`;
}
