import type { SpaceMemberRole } from "@/lib/api/types";

// role 상수 단일 출처 — 권한 강한 순.
export const SPACE_MEMBER_ROLES = [
  "OWNER",
  "MEMBER",
  "VIEWER",
] as const satisfies readonly SpaceMemberRole[];

export function isSpaceMemberRole(value: string): value is SpaceMemberRole {
  return (SPACE_MEMBER_ROLES as readonly string[]).includes(value);
}

// UI 노출 순서 — role 변경 dropdown 처럼 위계가 의미 있는 위치에서 사용.
export const SPACE_MEMBER_ROLE_DISPLAY_ORDER: readonly SpaceMemberRole[] = SPACE_MEMBER_ROLES;

// 초대 dialog 용 순서 — 새 멤버 초대의 안전 default 인 MEMBER 를 첫 옵션으로.
// 첫 시선이 default 와 어긋나지 않게 default `role` state 도 첫 원소 (MEMBER) 로 유지.
export const SPACE_MEMBER_INVITE_ROLE_ORDER: readonly SpaceMemberRole[] = [
  "MEMBER",
  "VIEWER",
  "OWNER",
];

const ROLE_LABEL: Record<SpaceMemberRole, string> = {
  OWNER: "소유자",
  MEMBER: "멤버",
  VIEWER: "뷰어",
};

const ROLE_DESCRIPTION: Record<SpaceMemberRole, string> = {
  OWNER: "스페이스 관리 · 멤버 초대 · 역할 변경 · 제거",
  MEMBER: "페이지 작성 · 수정",
  VIEWER: "읽기 전용",
};

export function spaceMemberRoleLabel(value: SpaceMemberRole): string {
  return ROLE_LABEL[value];
}

export function spaceMemberRoleDescription(value: SpaceMemberRole): string {
  return ROLE_DESCRIPTION[value];
}
