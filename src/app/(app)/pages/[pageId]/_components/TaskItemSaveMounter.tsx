"use client";

import type { JSONContent } from "@tiptap/react";
import { useEffect, useRef, type ReactNode } from "react";

import { usePageEdit } from "@/hooks/usePage";
import type { PageId } from "@/lib/api/ids";
import { serializeEditorContent } from "@/lib/editor/content";
import type { Visibility } from "@/lib/page/visibility";

type Props = {
  pageId: PageId;
  title: string;
  visibility: Visibility;
  initialContent: JSONContent;
  enabled: boolean;
  children: ReactNode;
};

const DEBOUNCE_MS = 500;

export function TaskItemSaveMounter({
  pageId,
  title,
  visibility,
  initialContent,
  enabled,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<JSONContent>(initialContent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editMutation = usePageEdit();
  // mutation 객체는 매 render 마다 새 ref — deps 에 넣으면 listener 가 매번 떼었다 붙는다.
  // ref 갱신은 별도 effect (render 중 ref mutation 회피 — react-hooks/refs).
  const mutateRef = useRef(editMutation.mutate);
  useEffect(() => {
    mutateRef.current = editMutation.mutate;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const inputs = root.querySelectorAll<HTMLInputElement>(
      'ul[data-type="taskList"] input[type="checkbox"]',
    );

    // 비편집자: 체크박스 자체를 disabled — "클릭은 되는데 저장 안 됨" false-positive 차단.
    // cleanup 으로 복원해 enabled toggle false→true stuck 회피.
    if (!enabled) {
      inputs.forEach((input) => {
        input.disabled = true;
      });
      return () => {
        inputs.forEach((input) => {
          input.disabled = false;
        });
      };
    }

    function flush() {
      if (timerRef.current === null) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
      mutateRef.current({
        pageId,
        body: { title, visibility, content: serializeEditorContent(contentRef.current) },
      });
    }

    function handleChange(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;
      const liNode = target.closest('li[data-type="taskItem"]');
      if (!(liNode instanceof HTMLLIElement)) return;
      if (!(root instanceof HTMLElement) || !root.contains(liNode)) return;

      const allItems = Array.from(root.querySelectorAll<HTMLLIElement>('li[data-type="taskItem"]'));
      const index = allItems.indexOf(liNode);
      if (index < 0) return;

      // 부모 → 자식 cascade (GitHub 류 task list 패턴). 자식만 클릭한 경우는 위로 전파 X — 부모는 "수동 표시" 유지.
      liNode.setAttribute("data-checked", String(target.checked));
      const descendantLis = liNode.querySelectorAll<HTMLLIElement>(
        ':scope > div li[data-type="taskItem"]',
      );
      const descendantInputs = liNode.querySelectorAll<HTMLInputElement>(
        ':scope > div input[type="checkbox"]',
      );
      descendantLis.forEach((d) => d.setAttribute("data-checked", String(target.checked)));
      descendantInputs.forEach((d) => {
        d.checked = target.checked;
      });

      const next = cascadeNthTaskItem(contentRef.current, index, target.checked);
      contentRef.current = next;

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        mutateRef.current({
          pageId,
          body: { title, visibility, content: serializeEditorContent(next) },
        });
      }, DEBOUNCE_MS);
    }

    root.addEventListener("change", handleChange);
    return () => {
      root.removeEventListener("change", handleChange);
      // page detail invalidation 으로 remount 가 발생해도 마지막 클릭 손실되지 않게 unmount 직전 즉시 PUT.
      flush();
    };
  }, [enabled, pageId, title, visibility]);

  return <div ref={ref}>{children}</div>;
}

// N 번째 taskItem 을 만나면 subtree 전체를 새 노드로 교체하고 그 안의 taskItem 들은 다시 visit 하지 않는다 —
// 후속 sibling 인덱스는 같은 카운트 기준으로 유지돼 부모/자식 어느 쪽이 클릭됐든 자기 인덱스 기준으로 cascade.
function cascadeNthTaskItem(doc: JSONContent, targetIndex: number, checked: boolean): JSONContent {
  let counter = 0;
  function visit(node: JSONContent): JSONContent {
    if (node.type === "taskItem") {
      const current = counter;
      counter += 1;
      if (current === targetIndex) {
        return cascadeSubtree(node, checked);
      }
    }
    if (!node.content) return node;
    return { ...node, content: node.content.map(visit) };
  }
  return visit(doc);
}

function cascadeSubtree(node: JSONContent, checked: boolean): JSONContent {
  const isTaskItem = node.type === "taskItem";
  const nextAttrs = isTaskItem ? { ...(node.attrs ?? {}), checked } : node.attrs;
  if (!node.content) return isTaskItem ? { ...node, attrs: nextAttrs } : node;
  const nextChildren = node.content.map((child) => cascadeSubtree(child, checked));
  return isTaskItem
    ? { ...node, attrs: nextAttrs, content: nextChildren }
    : { ...node, content: nextChildren };
}
