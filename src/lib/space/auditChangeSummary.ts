import type { SpaceAuditAction } from "@/lib/api/types";
import { spaceVisibilityLabel } from "@/lib/space/visibility";

const KNOWN_ACTIONS = ["REGISTERED", "EDITED", "DELETED"] as const;

export function isKnownAuditAction(value: string): value is SpaceAuditAction {
  return (KNOWN_ACTIONS as readonly string[]).includes(value);
}

// EDITED 는 부분 map (변경된 필드만), REGISTERED / DELETED 는 snapshot 전체.
type FieldKey = "name" | "description" | "visibility";

const FIELD_LABEL: Record<FieldKey, string> = {
  name: "이름",
  description: "설명",
  visibility: "공개 범위",
};

const FIELD_KEYS = Object.keys(FIELD_LABEL) as FieldKey[];

const EMPTY_LABEL = "없음";

const DEFAULT_LINES: Record<SpaceAuditAction, string> = {
  REGISTERED: "스페이스를 새로 등록했습니다.",
  EDITED: "변경 내용이 없습니다.",
  DELETED: "스페이스를 삭제했습니다.",
};

export function formatAuditChangeLines(action: SpaceAuditAction, rawJson: string): string[] {
  const parsed = safeParse(rawJson);
  if (parsed === null) {
    return [DEFAULT_LINES[action]];
  }

  if (action === "EDITED") {
    const lines = FIELD_KEYS.flatMap((key) => {
      const diff = parsed[key];
      if (!isDiff(diff)) return [];
      return [renderDiffLine(key, diff.before, diff.after)];
    });
    return lines.length === 0 ? [DEFAULT_LINES.EDITED] : lines;
  }

  const snapshot = FIELD_KEYS.flatMap((key) => {
    const value = parsed[key];
    if (typeof value !== "string") return [];
    return [renderSnapshotLine(key, value)];
  });
  return snapshot.length === 0 ? [DEFAULT_LINES[action]] : snapshot;
}

function safeParse(rawJson: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(rawJson);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

type Diff = { before: string; after: string };

function isDiff(value: unknown): value is Diff {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.before === "string" && typeof record.after === "string";
}

function renderDiffLine(key: FieldKey, before: string, after: string): string {
  const label = FIELD_LABEL[key];
  const beforeText = formatValue(key, before);
  const afterText = formatValue(key, after);
  return `${label}${objectParticle(label)} “${beforeText}” → “${afterText}”${directionParticle(afterText)} 변경`;
}

function renderSnapshotLine(key: FieldKey, value: string): string {
  return `${FIELD_LABEL[key]}: ${formatValue(key, value)}`;
}

function objectParticle(word: string): "을" | "를" {
  return finalConsonantIndex(word) !== FINAL_NONE ? "을" : "를";
}

// 방향 조사: 종성 없으면 "로", ㄹ (인덱스 8) 도 관례상 "로", 그 외 종성이면 "으로".
function directionParticle(word: string): "으로" | "로" {
  const index = finalConsonantIndex(word);
  return index === FINAL_NONE || index === FINAL_RIEUL ? "로" : "으로";
}

const FINAL_NONE = 0;
const FINAL_RIEUL = 8;

// 한글 음절의 종성 인덱스 (0=없음, 1..27=종성). 한글이 아니면 종성 없음 (0) 으로 취급.
function finalConsonantIndex(word: string): number {
  const last = word.at(-1);
  if (last === undefined) return FINAL_NONE;
  const code = last.charCodeAt(0);
  const HANGUL_BASE = 0xac00;
  const HANGUL_LAST = 0xd7a3;
  if (code < HANGUL_BASE || code > HANGUL_LAST) return FINAL_NONE;
  return (code - HANGUL_BASE) % 28;
}

function formatValue(key: FieldKey, value: string): string {
  if (value === "") return EMPTY_LABEL;
  if (key === "visibility") return spaceVisibilityLabel(value);
  return value;
}
