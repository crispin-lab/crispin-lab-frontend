import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";

import {
  PAGE_DRAFT_KEY_PREFIX,
  PAGE_DRAFT_TTL_MS,
  PAGE_EDIT_DRAFT_KEY_PREFIX,
  type PageDraft,
  type PageEditDraft,
  clearPageDraft,
  clearPageEditDraft,
  pageDraftKey,
  pageEditDraftKey,
  readPageDraft,
  readPageEditDraft,
  writePageDraft,
  writePageEditDraft,
} from "./draft";

const SPACE = asSpaceId("s_1");
const OTHER_SPACE = asSpaceId("s_2");
const PAGE = asPageId("p_1");
const OTHER_PAGE = asPageId("p_2");

function fixture(overrides: Partial<PageDraft> = {}): PageDraft {
  return {
    title: "초안 제목",
    content: '{"type":"doc","content":[]}',
    visibility: "DRAFT",
    parent: null,
    savedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pageDraftKey", () => {
  it("prefix + spaceId 로 키를 만든다", () => {
    expect(pageDraftKey(SPACE)).toBe(`${PAGE_DRAFT_KEY_PREFIX}s_1`);
  });
});

describe("write / read 라운드트립", () => {
  it("쓴 draft 를 그대로 읽어 온다", () => {
    const draft = fixture({ title: "회의록", parent: { pageId: "p_root", title: "회의" } });
    writePageDraft(SPACE, draft);
    expect(readPageDraft(SPACE)).toEqual(draft);
  });

  it("clearPageDraft 후에는 null 을 반환한다", () => {
    writePageDraft(SPACE, fixture());
    clearPageDraft(SPACE);
    expect(readPageDraft(SPACE)).toBeNull();
  });
});

describe("격리", () => {
  it("다른 spaceId 의 draft 와 키가 겹치지 않는다", () => {
    writePageDraft(SPACE, fixture({ title: "s_1 의 글" }));
    writePageDraft(OTHER_SPACE, fixture({ title: "s_2 의 글" }));
    expect(readPageDraft(SPACE)?.title).toBe("s_1 의 글");
    expect(readPageDraft(OTHER_SPACE)?.title).toBe("s_2 의 글");
  });
});

describe("TTL", () => {
  it("savedAt 이 7 일 전이면 미복원 + silent 삭제", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
    writePageDraft(SPACE, fixture({ savedAt: Date.now() - PAGE_DRAFT_TTL_MS - 1 }));

    expect(readPageDraft(SPACE)).toBeNull();
    expect(localStorage.getItem(pageDraftKey(SPACE))).toBeNull();
  });

  it("TTL 직전 (만료 1ms 전) 은 정상 복원된다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
    writePageDraft(SPACE, fixture({ savedAt: Date.now() - (PAGE_DRAFT_TTL_MS - 1) }));

    expect(readPageDraft(SPACE)).not.toBeNull();
  });
});

describe("손상된 값 가드", () => {
  it("JSON 파싱 실패 시 null + silent 정리", () => {
    localStorage.setItem(pageDraftKey(SPACE), "not-json");
    expect(readPageDraft(SPACE)).toBeNull();
    expect(localStorage.getItem(pageDraftKey(SPACE))).toBeNull();
  });

  it("스키마 불일치 시 null + silent 정리", () => {
    localStorage.setItem(pageDraftKey(SPACE), JSON.stringify({ title: 42 }));
    expect(readPageDraft(SPACE)).toBeNull();
    expect(localStorage.getItem(pageDraftKey(SPACE))).toBeNull();
  });

  it("알 수 없는 visibility 는 손상으로 본다", () => {
    localStorage.setItem(
      pageDraftKey(SPACE),
      JSON.stringify({ ...fixture(), visibility: "EXOTIC" }),
    );
    expect(readPageDraft(SPACE)).toBeNull();
  });

  it("parent.pageId 가 빈 문자열이면 손상으로 본다 — BE 로 빈 ID 가 흘러가는 회귀 차단", () => {
    localStorage.setItem(
      pageDraftKey(SPACE),
      JSON.stringify({ ...fixture(), parent: { pageId: "", title: "오염" } }),
    );
    expect(readPageDraft(SPACE)).toBeNull();
  });
});

describe("setItem 실패", () => {
  it("quota 초과 등 setItem throw 면 silent — 사용자 흐름에 영향 없음", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      expect(() => writePageDraft(SPACE, fixture())).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

function editFixture(overrides: Partial<PageEditDraft> = {}): PageEditDraft {
  return {
    title: "편집 중 제목",
    content: '{"type":"doc","content":[]}',
    visibility: "PUBLIC",
    savedAtVersion: 3,
    savedAt: Date.now(),
    ...overrides,
  };
}

describe("pageEditDraftKey", () => {
  it("prefix + pageId 로 키를 만든다", () => {
    expect(pageEditDraftKey(PAGE)).toBe(`${PAGE_EDIT_DRAFT_KEY_PREFIX}p_1`);
  });
});

describe("PageEditDraft write / read 라운드트립", () => {
  it("쓴 draft 를 그대로 읽어 온다 (savedAtVersion 보존)", () => {
    const draft = editFixture({ savedAtVersion: 7 });
    writePageEditDraft(PAGE, draft);
    expect(readPageEditDraft(PAGE)).toEqual(draft);
  });

  it("clearPageEditDraft 후에는 null 을 반환한다", () => {
    writePageEditDraft(PAGE, editFixture());
    clearPageEditDraft(PAGE);
    expect(readPageEditDraft(PAGE)).toBeNull();
  });
});

describe("PageEditDraft 격리", () => {
  it("다른 pageId 의 draft 와 키가 겹치지 않는다", () => {
    writePageEditDraft(PAGE, editFixture({ title: "p_1 의 편집" }));
    writePageEditDraft(OTHER_PAGE, editFixture({ title: "p_2 의 편집" }));
    expect(readPageEditDraft(PAGE)?.title).toBe("p_1 의 편집");
    expect(readPageEditDraft(OTHER_PAGE)?.title).toBe("p_2 의 편집");
  });

  it("PageDraft (생성) 와 PageEditDraft (편집) 의 키가 겹치지 않는다", () => {
    writePageDraft(SPACE, fixture({ title: "생성 초안" }));
    writePageEditDraft(PAGE, editFixture({ title: "편집 초안" }));
    expect(readPageDraft(SPACE)?.title).toBe("생성 초안");
    expect(readPageEditDraft(PAGE)?.title).toBe("편집 초안");
  });
});

describe("PageEditDraft 손상 가드", () => {
  it("savedAtVersion 이 number 가 아니면 손상으로 본다", () => {
    localStorage.setItem(
      pageEditDraftKey(PAGE),
      JSON.stringify({ ...editFixture(), savedAtVersion: "v3" }),
    );
    expect(readPageEditDraft(PAGE)).toBeNull();
  });
});
