import type { PageId } from "@/lib/api/ids";
import type { PageSummary } from "@/lib/api/types";

export type PageTreeNode = {
  page: PageSummary;
  children: PageTreeNode[];
};

const titleCollator = new Intl.Collator("ko", { sensitivity: "base", numeric: true });

export function buildPageTree(items: readonly PageSummary[]): PageTreeNode[] {
  const nodeById = new Map<string, PageTreeNode>();
  for (const page of items) {
    nodeById.set(page.pageId, { page, children: [] });
  }

  const roots: PageTreeNode[] = [];
  for (const page of items) {
    const node = nodeById.get(page.pageId);
    if (node === undefined) continue;
    const parentId = safeParentId(page.pageId, page.parentPageId, nodeById);
    if (parentId === null) {
      roots.push(node);
      continue;
    }
    // safeParentId 의 contract: null 이 아니면 nodeById 에 반드시 존재. non-null assertion 안전.
    const parentNode = nodeById.get(parentId)!;
    parentNode.children.push(node);
  }

  roots.sort(compareNodes);
  for (const node of nodeById.values()) {
    node.children.sort(compareNodes);
  }
  return roots;
}

// 활성 페이지의 조상 체인 (root → ... → 자기 자신 포함) id 모음.
// 사이드바의 디폴트 expand 대상 계산용. cycle 데이터에서도 안전 종료.
export function ancestorIdsOf(items: readonly PageSummary[], pageId: PageId): ReadonlySet<string> {
  const byId = new Map(items.map((item) => [item.pageId, item]));
  const ids = new Set<string>();
  let cursor: string | null | undefined = pageId;
  while (cursor != null && byId.has(cursor) && !ids.has(cursor)) {
    ids.add(cursor);
    cursor = byId.get(cursor)?.parentPageId;
  }
  return ids;
}

// 빈 query 처리를 함수 안에서 흡수해 호출부의 no-op 분기를 줄인다.
export function matchedPageIdsOf(
  items: readonly PageSummary[],
  query: string,
): ReadonlySet<string> {
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  if (normalized === "") return new Set();
  const matched = new Set<string>();
  for (const item of items) {
    if (item.title.toLocaleLowerCase("ko-KR").includes(normalized)) {
      matched.add(item.pageId);
    }
  }
  return matched;
}

// 트리 단절 방지 (조상) + 매칭에서 즉시 드릴다운 가능 (하위 전체) 의도.
// 빈 query 는 입력 items 를 그대로 반환 — 호출부에서 추가 분기 없이 buildPageTree 에 넘길 수 있게.
export function filterPageItemsByQuery(
  items: readonly PageSummary[],
  query: string,
): readonly PageSummary[] {
  const matched = matchedPageIdsOf(items, query);
  if (matched.size === 0) {
    return query.trim() === "" ? items : [];
  }

  const byId = new Map(items.map((item) => [item.pageId, item]));
  const childrenByParent = new Map<string, string[]>();
  for (const item of items) {
    const parentId = item.parentPageId;
    if (parentId == null || !byId.has(parentId)) continue;
    const bucket = childrenByParent.get(parentId);
    if (bucket === undefined) childrenByParent.set(parentId, [item.pageId]);
    else bucket.push(item.pageId);
  }

  const keep = new Set<string>(matched);

  for (const startId of matched) {
    let cursor: string | null | undefined = byId.get(startId)?.parentPageId;
    while (cursor != null && byId.has(cursor) && !keep.has(cursor)) {
      keep.add(cursor);
      cursor = byId.get(cursor)?.parentPageId;
    }
  }

  const stack: string[] = Array.from(matched);
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const children = childrenByParent.get(current);
    if (children === undefined) continue;
    for (const childId of children) {
      if (keep.has(childId)) continue;
      keep.add(childId);
      stack.push(childId);
    }
  }

  return items.filter((item) => keep.has(item.pageId));
}

// safeParentId — null 반환 시 해당 노드는 root 로. null 이 아니면 nodeById 에 반드시 존재한다 (호출부에서 ! 사용 가능).
function safeParentId(
  selfId: string,
  rawParentId: string | null | undefined,
  nodeById: ReadonlyMap<string, PageTreeNode>,
): string | null {
  if (rawParentId == null) return null;
  if (!nodeById.has(rawParentId)) return null;

  const visited = new Set<string>();
  let cursor: string | null | undefined = rawParentId;
  while (cursor != null) {
    if (cursor === selfId) {
      // silent drop 은 회귀를 숨기므로 경고를 남긴다 — 자기 자신을 조상으로 갖는 데이터가 등장한 시점.
      // 운영 환경에선 같은 트리에서 매 마운트 누적되므로 dev only.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[buildPageTree] 순환 감지: pageId=${selfId} 의 부모 체인이 자기 자신으로 회귀`,
        );
      }
      return null;
    }
    if (visited.has(cursor)) return null;
    visited.add(cursor);
    const parent = nodeById.get(cursor);
    if (parent === undefined) return rawParentId;
    cursor = parent.page.parentPageId;
  }
  return rawParentId;
}

// 정렬 키 폴백 체인: displayOrder asc → title (ko locale) → updatedAt desc.
// displayOrder 는 백엔드가 (spaceId, parentPageId) scope 안에서 보장하는 명시 키.
// schema 는 displayOrder 를 required 로 잡지만 backend 머지 전 응답이 흘러들 가능성이 있어 nullish 가드.
function compareNodes(a: PageTreeNode, b: PageTreeNode): number {
  const ao = a.page.displayOrder ?? Number.POSITIVE_INFINITY;
  const bo = b.page.displayOrder ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  const byTitle = titleCollator.compare(a.page.title, b.page.title);
  if (byTitle !== 0) return byTitle;
  if (a.page.updatedAt > b.page.updatedAt) return -1;
  if (a.page.updatedAt < b.page.updatedAt) return 1;
  return 0;
}
