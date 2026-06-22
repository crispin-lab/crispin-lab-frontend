import type { PageId, SpaceId } from "@/lib/api/ids";

import { isVisibility, type Visibility } from "./visibility";

// 새 페이지 생성 / 편집 중인 폼 값을 새로고침·실수 닫기로부터 보호하는 *얇은 안전망*.
// 정식 draft 보존은 백엔드의 `DRAFT` visibility 가 별도로 담당한다 — 둘은 목적과 수명이 다르다.
export const PAGE_DRAFT_KEY_PREFIX = "page-draft:";
export const PAGE_EDIT_DRAFT_KEY_PREFIX = "page-edit-draft:";
export const PAGE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PageDraftParent = { pageId: string; title: string };

export type PageDraft = {
  title: string;
  content: string;
  visibility: Visibility;
  parent: PageDraftParent | null;
  savedAt: number;
};

export type PageEditDraft = {
  title: string;
  content: string;
  visibility: Visibility;
  // draft 저장 시점에 본 BE 원본의 버전 — 진입 시 BE 의 currentVersion 과 비교해 다른 곳의 변경을 감지.
  savedAtVersion: number;
  savedAt: number;
};

export function pageDraftKey(spaceId: SpaceId): string {
  return `${PAGE_DRAFT_KEY_PREFIX}${spaceId}`;
}

export function pageEditDraftKey(pageId: PageId): string {
  return `${PAGE_EDIT_DRAFT_KEY_PREFIX}${pageId}`;
}

export function readPageDraft(spaceId: SpaceId): PageDraft | null {
  return readDraft(pageDraftKey(spaceId), isPageDraft);
}

export function writePageDraft(spaceId: SpaceId, draft: PageDraft): void {
  writeDraft(pageDraftKey(spaceId), draft);
}

export function clearPageDraft(spaceId: SpaceId): void {
  clearDraft(pageDraftKey(spaceId));
}

export function readPageEditDraft(pageId: PageId): PageEditDraft | null {
  return readDraft(pageEditDraftKey(pageId), isPageEditDraft);
}

export function writePageEditDraft(pageId: PageId, draft: PageEditDraft): void {
  writeDraft(pageEditDraftKey(pageId), draft);
}

export function clearPageEditDraft(pageId: PageId): void {
  clearDraft(pageEditDraftKey(pageId));
}

type BaseDraft = { savedAt: number };

// 두 draft 타입의 검증 표면이 다르므로 guard 를 인자로 주입 — storage 가드 / TTL / 손상 처리 본체만 공통화.
function readDraft<T extends BaseDraft>(key: string, guard: (v: unknown) => v is T): T | null {
  const storage = safeLocalStorage();
  if (storage === null) return null;
  const raw = storage.getItem(key);
  if (raw === null) return null;

  const parsed = safeParse(raw);
  if (parsed === null || !guard(parsed)) {
    // 손상된 값은 silent 정리 — 다음 진입에서 깨끗한 상태로.
    safeRemove(storage, key);
    return null;
  }
  if (Date.now() - parsed.savedAt > PAGE_DRAFT_TTL_MS) {
    safeRemove(storage, key);
    return null;
  }
  return parsed;
}

function writeDraft(key: string, draft: unknown): void {
  const storage = safeLocalStorage();
  if (storage === null) return;
  try {
    storage.setItem(key, JSON.stringify(draft));
  } catch {
    // quota 초과 / private mode 등. draft 미저장은 폼 작동에 영향 없음 — silent.
  }
}

function clearDraft(key: string): void {
  const storage = safeLocalStorage();
  if (storage === null) return;
  safeRemove(storage, key);
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* empty */
  }
}

function isPageDraft(value: unknown): value is PageDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string") return false;
  if (typeof v.content !== "string") return false;
  if (typeof v.visibility !== "string" || !isVisibility(v.visibility)) return false;
  if (typeof v.savedAt !== "number" || !Number.isFinite(v.savedAt)) return false;
  if (v.parent !== null) {
    if (typeof v.parent !== "object" || v.parent === null) return false;
    const p = v.parent as Record<string, unknown>;
    if (typeof p.pageId !== "string" || p.pageId.length === 0) return false;
    if (typeof p.title !== "string") return false;
  }
  return true;
}

function isPageEditDraft(value: unknown): value is PageEditDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string") return false;
  if (typeof v.content !== "string") return false;
  if (typeof v.visibility !== "string" || !isVisibility(v.visibility)) return false;
  if (typeof v.savedAtVersion !== "number" || !Number.isFinite(v.savedAtVersion)) return false;
  if (typeof v.savedAt !== "number" || !Number.isFinite(v.savedAt)) return false;
  return true;
}
