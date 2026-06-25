import { DetailsContent, DetailsNode, DetailsSummary } from "./node";

// editor 한정 NodeView — summary 클릭으로 native disclosure 토글을 가로채 PM state (`attrs.open`) 가 단일 출처.
// summary 안의 click / mousedown / pointerdown 을 PM 에서 차단 — pointerdown 이 닿으면 caret 이 summary 로 옮겨 토글 전에 selection 이 흔들린다.
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
          if (summary === null) return;
          // 직접 부모 details 만 매칭 — nested details (inner summary) 클릭이 outer 의 click 리스너로 bubble 되어
          // outer 도 같이 토글되는 회귀 차단. dom.contains() 는 nested 자식까지 true 라 부적합.
          if (summary.closest("details") !== dom) return;
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
            return summary !== null && summary.closest("details") === dom;
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
