import { type SpaceVisibility, spaceVisibilityLabel } from "@/lib/space/visibility";

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

// audience 축 (0=author only, 1=space members, 2=anyone) 위에 space/page 를 각각 매핑.
// DRAFT/INTERNAL 은 페이지 문맥에서 author 한 명 → 같은 rank. INTERNAL 스페이스는 space members 를
// 담을 수 있으므로 MEMBER 페이지 (rank 1) 를 허용 — 두 축을 한 rank 표로 합치면 이 관계가 깨진다.
const PAGE_VISIBILITY_RANK: Record<Visibility, number> = {
  DRAFT: 0,
  INTERNAL: 0,
  MEMBER: 1,
  PUBLIC: 2,
};

const SPACE_VISIBILITY_RANK: Record<SpaceVisibility, number> = {
  INTERNAL: 1,
  PUBLIC: 2,
};

export function isPageVisibilityNarrowerThan(target: Visibility, source: Visibility): boolean {
  return PAGE_VISIBILITY_RANK[target] < PAGE_VISIBILITY_RANK[source];
}

// 백엔드 PageLink displayText 마스킹 라벨과 정확히 일치해야 한다 — backend schema 의
// `PageGetResponse.content` 설명이 동일 문구 ('비공개 페이지') 를 약속한다.
export function buildNarrowerPageVisibilityWarning(target: Visibility, source: Visibility): string {
  return `이 페이지는 ${visibilityLabel(target)} 페이지입니다. ${visibilityLabel(source)} 페이지를 보는 일부 독자에게는 '비공개 페이지' 로 표시됩니다.`;
}

// space ↔ page cascade — page 가 space 보다 넓으면 BE 가 거부. 작성 시점 dropdown 에서 미리 차단.
export function isVisibilityBlockedByCascade(
  option: Visibility,
  spaceVisibility: SpaceVisibility,
): boolean {
  return PAGE_VISIBILITY_RANK[option] > SPACE_VISIBILITY_RANK[spaceVisibility];
}

export function buildCascadeBlockedReason(spaceVisibility: SpaceVisibility): string {
  return `이 스페이스는 ${spaceVisibilityLabel(spaceVisibility)} 입니다. 페이지를 더 넓게 공개할 수 없습니다.`;
}
