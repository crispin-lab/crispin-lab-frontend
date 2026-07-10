import { describe, expect, it } from "vitest";

import { formatAuditChangeLines } from "./auditChangeSummary";

describe("formatAuditChangeLines", () => {
  it("EDITED — 변경된 필드마다 한국어 문장 조립 + after 종성 유무에 따라 로/으로 선택", () => {
    const raw = JSON.stringify({
      // 스페이스 → 종성 없음 → "로"
      name: { before: "예전 스페이스", after: "새 스페이스" },
      // 설명 → 종성 있음 → "으로"
      description: { before: "예전 설명", after: "새 설명" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual([
      "이름을 “예전 스페이스” → “새 스페이스”로 변경",
      "설명을 “예전 설명” → “새 설명”으로 변경",
    ]);
  });

  it("EDITED — visibility 는 사용자용 라벨로 치환 (비공개 → 종성 없음 → 로)", () => {
    const raw = JSON.stringify({
      visibility: { before: "PUBLIC", after: "INTERNAL" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["공개 범위를 “공개” → “비공개”로 변경"]);
  });

  it("EDITED — 빈 문자열 before 는 '없음' 으로 표기", () => {
    const raw = JSON.stringify({
      description: { before: "", after: "새 설명" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["설명을 “없음” → “새 설명”으로 변경"]);
  });

  it("EDITED — after 가 라틴 알파벳/숫자면 로 (fallback)", () => {
    const raw = JSON.stringify({
      name: { before: "A", after: "B" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["이름을 “A” → “B”로 변경"]);
  });

  it("EDITED — ㄹ 받침 (인덱스 8) 은 관례상 로", () => {
    const raw = JSON.stringify({
      // 길 → ㄹ 종성 → "로"
      name: { before: "예전 스페이스", after: "길" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["이름을 “예전 스페이스” → “길”로 변경"]);
  });

  it("EDITED — ㄹ 받침 예외 (서울) 도 로", () => {
    const raw = JSON.stringify({
      description: { before: "예전 설명", after: "서울" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["설명을 “예전 설명” → “서울”로 변경"]);
  });

  it("REGISTERED — snapshot 을 필드 순서대로 한 줄씩", () => {
    const raw = JSON.stringify({
      name: "새 스페이스",
      description: "",
      visibility: "PUBLIC",
    });
    expect(formatAuditChangeLines("REGISTERED", raw)).toEqual([
      "이름: 새 스페이스",
      "설명: 없음",
      "공개 범위: 공개",
    ]);
  });

  it("DELETED — snapshot 을 그대로 표시", () => {
    const raw = JSON.stringify({
      name: "지운 스페이스",
      description: "설명",
      visibility: "INTERNAL",
    });
    expect(formatAuditChangeLines("DELETED", raw)).toEqual([
      "이름: 지운 스페이스",
      "설명: 설명",
      "공개 범위: 비공개",
    ]);
  });

  it("파싱 실패 시 action 별 기본 문구로 fallback", () => {
    expect(formatAuditChangeLines("EDITED", "not-json")).toEqual(["변경 내용이 없습니다."]);
    expect(formatAuditChangeLines("REGISTERED", "not-json")).toEqual([
      "스페이스를 새로 등록했습니다.",
    ]);
    expect(formatAuditChangeLines("DELETED", "[]")).toEqual(["스페이스를 삭제했습니다."]);
  });

  it("EDITED — 알 수 없는 필드는 무시하고 알려진 필드만 노출", () => {
    const raw = JSON.stringify({
      name: { before: "A", after: "B" },
      unknownField: { before: "X", after: "Y" },
    });
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["이름을 “A” → “B”로 변경"]);
  });

  it("EDITED — 유효한 diff 가 하나도 없으면 fallback 라인", () => {
    const raw = JSON.stringify({});
    expect(formatAuditChangeLines("EDITED", raw)).toEqual(["변경 내용이 없습니다."]);
  });
});
