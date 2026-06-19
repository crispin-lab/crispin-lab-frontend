import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId } from "@/lib/api/ids";
import type { PageSummary } from "@/lib/api/types";

import {
  ancestorIdsOf,
  buildPageTree,
  filterPageItemsByQuery,
  matchedPageIdsOf,
  type PageTreeNode,
} from "./tree";

function page(input: {
  pageId: string;
  title: string;
  parentPageId?: string | null;
  updatedAt?: string;
  displayOrder?: number;
}): PageSummary {
  return {
    pageId: input.pageId,
    spaceId: "s_1",
    title: input.title,
    updatedAt: input.updatedAt ?? "2026-06-01T00:00:00Z",
    parentPageId: input.parentPageId,
    displayOrder: input.displayOrder ?? 0,
    authorHandle: "author",
    authorId: "u_1",
    visibility: "PUBLIC",
  };
}

function ids(nodes: readonly PageTreeNode[]): string[] {
  return nodes.map((node) => node.page.pageId);
}

describe("buildPageTree", () => {
  it("빈 입력은 빈 배열을 반환한다", () => {
    expect(buildPageTree([])).toEqual([]);
  });

  it("부모-자식-손자 트리를 정확히 재구성한다", () => {
    const tree = buildPageTree([
      page({ pageId: "p_root", title: "루트" }),
      page({ pageId: "p_child", title: "자식", parentPageId: "p_root" }),
      page({ pageId: "p_grand", title: "손자", parentPageId: "p_child" }),
    ]);

    expect(ids(tree)).toEqual(["p_root"]);
    expect(ids(tree[0].children)).toEqual(["p_child"]);
    expect(ids(tree[0].children[0].children)).toEqual(["p_grand"]);
  });

  it("입력 순서와 무관하게 같은 결과를 만든다", () => {
    const sources: PageSummary[] = [
      page({ pageId: "p_grand", title: "손자", parentPageId: "p_child" }),
      page({ pageId: "p_root", title: "루트" }),
      page({ pageId: "p_child", title: "자식", parentPageId: "p_root" }),
    ];
    const tree = buildPageTree(sources);
    expect(ids(tree)).toEqual(["p_root"]);
    expect(ids(tree[0].children)).toEqual(["p_child"]);
  });

  it("parentPageId 가 입력 목록에 없는 페이지는 root 로 격상된다 (고아)", () => {
    const tree = buildPageTree([
      page({ pageId: "p_orphan", title: "고아", parentPageId: "p_missing" }),
      page({ pageId: "p_root", title: "루트" }),
    ]);
    expect(new Set(ids(tree))).toEqual(new Set(["p_orphan", "p_root"]));
  });

  it("parentPageId 가 nullish 인 페이지는 root", () => {
    const tree = buildPageTree([
      page({ pageId: "p_a", title: "가", parentPageId: null }),
      page({ pageId: "p_b", title: "나", parentPageId: undefined }),
    ]);
    expect(ids(tree)).toEqual(["p_a", "p_b"]);
  });

  describe("순환 방어", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("자기 자신을 부모로 가지면 root 로 격상되고 경고를 남긴다", () => {
      const tree = buildPageTree([
        page({ pageId: "p_self", title: "자기", parentPageId: "p_self" }),
      ]);
      expect(ids(tree)).toEqual(["p_self"]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("A↔B 양방향 순환은 둘 다 root 로 격상된다", () => {
      const tree = buildPageTree([
        page({ pageId: "p_a", title: "가", parentPageId: "p_b" }),
        page({ pageId: "p_b", title: "나", parentPageId: "p_a" }),
      ]);
      expect(new Set(ids(tree))).toEqual(new Set(["p_a", "p_b"]));
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("정렬", () => {
    it("같은 부모 아래 자식은 displayOrder asc 로 정렬된다 — title 가나다순보다 우선", () => {
      const tree = buildPageTree([
        page({ pageId: "p_root", title: "루트" }),
        page({ pageId: "p_a", title: "가", parentPageId: "p_root", displayOrder: 2 }),
        page({ pageId: "p_b", title: "나", parentPageId: "p_root", displayOrder: 0 }),
        page({ pageId: "p_c", title: "다", parentPageId: "p_root", displayOrder: 1 }),
      ]);
      // displayOrder 가 우선이라 b(0) → c(1) → a(2). title 가나다순이면 a/b/c 였을 것.
      expect(ids(tree[0].children)).toEqual(["p_b", "p_c", "p_a"]);
    });

    it("displayOrder 가 모두 동률이면 title ko locale asc 로 폴백된다", () => {
      const tree = buildPageTree([
        page({ pageId: "p_root", title: "루트" }),
        page({ pageId: "p_c", title: "다", parentPageId: "p_root" }),
        page({ pageId: "p_a", title: "가", parentPageId: "p_root" }),
        page({ pageId: "p_b", title: "나", parentPageId: "p_root" }),
      ]);
      expect(ids(tree[0].children)).toEqual(["p_a", "p_b", "p_c"]);
    });

    it("displayOrder · title 모두 동률이면 최근 수정 (updatedAt desc) 이 위로 온다", () => {
      const tree = buildPageTree([
        page({ pageId: "p_old", title: "같은제목", updatedAt: "2026-01-01T00:00:00Z" }),
        page({ pageId: "p_new", title: "같은제목", updatedAt: "2026-06-01T00:00:00Z" }),
      ]);
      expect(ids(tree)).toEqual(["p_new", "p_old"]);
    });
  });
});

describe("ancestorIdsOf", () => {
  it("활성 페이지의 root → 자기 자신 체인을 모은다", () => {
    const items = [
      page({ pageId: "p_root", title: "루트" }),
      page({ pageId: "p_child", title: "자식", parentPageId: "p_root" }),
      page({ pageId: "p_grand", title: "손자", parentPageId: "p_child" }),
    ];
    const set = ancestorIdsOf(items, asPageId("p_grand"));
    expect(set).toEqual(new Set(["p_grand", "p_child", "p_root"]));
  });

  it("순환 데이터에서도 무한 루프 없이 종료한다", () => {
    const items = [
      page({ pageId: "p_a", title: "가", parentPageId: "p_b" }),
      page({ pageId: "p_b", title: "나", parentPageId: "p_a" }),
    ];
    const set = ancestorIdsOf(items, asPageId("p_a"));
    expect(set).toEqual(new Set(["p_a", "p_b"]));
  });

  it("입력 목록에 없는 id 는 빈 집합을 반환한다", () => {
    expect(ancestorIdsOf([], asPageId("p_missing"))).toEqual(new Set());
  });
});

describe("matchedPageIdsOf", () => {
  it("빈 query 는 빈 Set 을 반환한다", () => {
    const items = [page({ pageId: "p_a", title: "가" })];
    expect(matchedPageIdsOf(items, "")).toEqual(new Set());
    expect(matchedPageIdsOf(items, "   ")).toEqual(new Set());
  });

  it("title 부분 일치를 대소문자 무관으로 매칭한다", () => {
    const items = [
      page({ pageId: "p_a", title: "Auth flow" }),
      page({ pageId: "p_b", title: "디자인 노트" }),
      page({ pageId: "p_c", title: "Tokens" }),
    ];
    expect(matchedPageIdsOf(items, "auth")).toEqual(new Set(["p_a"]));
    expect(matchedPageIdsOf(items, "디자인")).toEqual(new Set(["p_b"]));
  });

  it("매칭이 없으면 빈 Set", () => {
    const items = [page({ pageId: "p_a", title: "다른 제목" })];
    expect(matchedPageIdsOf(items, "없음")).toEqual(new Set());
  });
});

describe("filterPageItemsByQuery", () => {
  function setIds(items: readonly PageSummary[]): Set<string> {
    return new Set(items.map((item) => item.pageId));
  }

  it("빈 query 는 입력 items 를 그대로 반환한다", () => {
    const items = [page({ pageId: "p_a", title: "가" }), page({ pageId: "p_b", title: "나" })];
    expect(filterPageItemsByQuery(items, "")).toBe(items);
  });

  it("매칭 + 조상 체인 + 매칭의 하위 전체를 남긴다 (그 외는 제거)", () => {
    const items = [
      page({ pageId: "p_root", title: "루트" }),
      page({ pageId: "p_auth", title: "Auth", parentPageId: "p_root" }),
      page({ pageId: "p_login", title: "Login flow", parentPageId: "p_auth" }),
      page({ pageId: "p_token", title: "Tokens", parentPageId: "p_auth" }),
      page({ pageId: "p_other", title: "다른", parentPageId: "p_root" }),
    ];
    const filtered = filterPageItemsByQuery(items, "auth");
    expect(setIds(filtered)).toEqual(new Set(["p_root", "p_auth", "p_login", "p_token"]));
  });

  it("매칭이 0개면 빈 배열", () => {
    const items = [
      page({ pageId: "p_root", title: "루트" }),
      page({ pageId: "p_a", title: "가", parentPageId: "p_root" }),
    ];
    expect(filterPageItemsByQuery(items, "없음")).toEqual([]);
  });

  it("순환 데이터에서도 무한 루프 없이 종료하고 매칭을 포함한다", () => {
    const items = [
      page({ pageId: "p_a", title: "Auth", parentPageId: "p_b" }),
      page({ pageId: "p_b", title: "기타", parentPageId: "p_a" }),
    ];
    const filtered = filterPageItemsByQuery(items, "auth");
    expect(setIds(filtered)).toEqual(new Set(["p_a", "p_b"]));
  });

  it("매칭이 root 이면 그 root 의 전체 하위가 남는다", () => {
    const items = [
      page({ pageId: "p_root", title: "Auth 루트" }),
      page({ pageId: "p_child", title: "자식", parentPageId: "p_root" }),
      page({ pageId: "p_other", title: "다른" }),
    ];
    const filtered = filterPageItemsByQuery(items, "auth");
    expect(setIds(filtered)).toEqual(new Set(["p_root", "p_child"]));
  });
});
