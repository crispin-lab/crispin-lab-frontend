import { DetailsContent, DetailsNode, DetailsSummary } from "./node";

// NodeView 는 editor 한정 — native <summary> 클릭이 ProseMirror state 와 동기되어 attrs.open 이 단일 출처.
// viewer 는 static-renderer 라 NodeView 미적용 — viewer.ts 가 DETAILS_NODES 를 그대로 export.
// summary 안의 click / mousedown / pointerdown 을 모두 PM 으로부터 차단 — pointerdown 이 PM 에 닿으면 caret 이 summary 로 옮겨가 토글 전에 selection 이 흔들린다. summary 텍스트 편집은 키보드 nav (Tab 등) 로 진입.
export const editorDetails = [
  DetailsNode.extend({
    addNodeView() {
      return ({ node, getPos, editor }) => {
        const dom = document.createElement("details");
        dom.className = "details";
        if (node.attrs.open) dom.setAttribute("open", "");

        function onClick(event: Event) {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const summary = target.closest("summary");
          if (summary === null || !dom.contains(summary)) return;
          // native disclosure 토글 차단 — open attr 는 ProseMirror state 가 단일 출처.
          event.preventDefault();
          const pos = getPos();
          if (pos === undefined) return;
          const current = editor.state.doc.nodeAt(pos);
          if (current === null || current.type.name !== "details") return;
          editor
            .chain()
            .command(({ tr, dispatch }) => {
              tr.setNodeAttribute(pos, "open", !current.attrs.open);
              dispatch?.(tr);
              return true;
            })
            .run();
        }
        dom.addEventListener("click", onClick);

        return {
          dom,
          contentDOM: dom,
          update(newNode) {
            if (newNode.type.name !== "details") return false;
            if (newNode.attrs.open) dom.setAttribute("open", "");
            else dom.removeAttribute("open");
            return true;
          },
          stopEvent(event) {
            // click / mousedown / pointerdown 모두 차단 — PM 이 pointerdown 단계에서 caret 을 옮기지 못하게.
            if (
              event.type !== "click" &&
              event.type !== "mousedown" &&
              event.type !== "pointerdown"
            ) {
              return false;
            }
            const target = event.target;
            if (!(target instanceof Element)) return false;
            const summary = target.closest("summary");
            return summary !== null && dom.contains(summary);
          },
          ignoreMutation(mutation) {
            // update() 가 직접 set/remove 한 open attribute 가 PM mutation observer 를 깨우지 않게.
            return (
              mutation.type === "attributes" &&
              mutation.target === dom &&
              mutation.attributeName === "open"
            );
          },
          destroy() {
            dom.removeEventListener("click", onClick);
          },
        };
      };
    },
  }),
  DetailsSummary,
  DetailsContent,
];
