import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { asPageId } from "@/lib/api/ids";
import type { PageSummary } from "@/lib/api/types";
import type { PageTreeNode as PageTreeNodeData } from "@/lib/page/tree";

import { PageTreeNode } from "./PageTreeNode";

function summary(input: { pageId: string; title: string }): PageSummary {
  return {
    pageId: input.pageId,
    spaceId: "s_1",
    title: input.title,
    updatedAt: "2026-01-01T00:00:00Z",
    displayOrder: 0,
    parentPageId: null,
  };
}

function leaf(input: { pageId: string; title: string }): PageTreeNodeData {
  return { page: summary(input), children: [] };
}

function branch(
  input: { pageId: string; title: string },
  children: PageTreeNodeData[],
): PageTreeNodeData {
  return { page: summary(input), children };
}

function renderNode(node: PageTreeNodeData, overrides?: { defaultExpandedIds?: Set<string> }) {
  return render(
    <ul>
      <PageTreeNode
        node={node}
        activePageId={asPageId("p_active")}
        defaultExpandedIds={overrides?.defaultExpandedIds ?? new Set()}
        level={0}
      />
    </ul>,
  );
}

describe("PageTreeNode", () => {
  it("leaf 노드는 chevron 버튼이 없다", () => {
    renderNode(leaf({ pageId: "p_only", title: "외톨이" }));
    expect(screen.queryByRole("button", { name: /펼치기|접기/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "외톨이" })).toBeInTheDocument();
  });

  it("자식이 있는 노드는 chevron 으로 토글되고 자식 link 가 등장한다", async () => {
    const user = userEvent.setup();
    renderNode(
      branch({ pageId: "p_parent", title: "부모" }, [leaf({ pageId: "p_kid", title: "자식" })]),
    );

    // mount 시점에는 defaultExpandedIds 가 비어 있어 collapsed.
    expect(screen.queryByRole("link", { name: "자식" })).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "펼치기" });
    await user.click(toggle);
    expect(screen.getByRole("link", { name: "자식" })).toBeInTheDocument();

    // 다시 클릭해 접으면 자식 link 가 사라진다.
    await user.click(screen.getByRole("button", { name: "접기" }));
    expect(screen.queryByRole("link", { name: "자식" })).not.toBeInTheDocument();
  });

  it("defaultExpandedIds 에 포함된 노드는 mount 시점부터 펼쳐진다", () => {
    renderNode(
      branch({ pageId: "p_parent", title: "부모" }, [leaf({ pageId: "p_kid", title: "자식" })]),
      { defaultExpandedIds: new Set(["p_parent"]) },
    );
    expect(screen.getByRole("link", { name: "자식" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "접기" })).toBeInTheDocument();
  });

  it("active 페이지의 link 에만 aria-current='page' 가 붙는다", () => {
    renderNode(
      branch({ pageId: "p_parent", title: "부모" }, [
        leaf({ pageId: "p_active", title: "활성" }),
        leaf({ pageId: "p_other", title: "기타" }),
      ]),
      { defaultExpandedIds: new Set(["p_parent"]) },
    );
    expect(screen.getByRole("link", { name: "활성" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "기타" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "부모" })).not.toHaveAttribute("aria-current");
  });

  it("ArrowRight 는 접혀 있을 때만 펼치고, ArrowLeft 는 펼쳐 있을 때만 접는다", async () => {
    const user = userEvent.setup();
    renderNode(
      branch({ pageId: "p_parent", title: "부모" }, [leaf({ pageId: "p_kid", title: "자식" })]),
    );

    const parentLink = screen.getByRole("link", { name: "부모" });
    parentLink.focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("link", { name: "자식" })).toBeInTheDocument();

    // 이미 펼쳐진 상태에서 ArrowRight 재호출은 no-op (자식이 그대로 있어야 함).
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("link", { name: "자식" })).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByRole("link", { name: "자식" })).not.toBeInTheDocument();

    // 이미 접힌 상태에서 ArrowLeft 재호출은 no-op.
    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByRole("link", { name: "자식" })).not.toBeInTheDocument();
  });

  it("leaf 노드의 link 에 ArrowLeft/Right 를 눌러도 아무 일도 일어나지 않는다", async () => {
    const user = userEvent.setup();
    renderNode(leaf({ pageId: "p_only", title: "외톨이" }));
    const link = screen.getByRole("link", { name: "외톨이" });
    link.focus();
    await user.keyboard("{ArrowRight}{ArrowLeft}");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
