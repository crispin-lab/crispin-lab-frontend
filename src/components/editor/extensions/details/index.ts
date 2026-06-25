import { DetailsContent, DetailsNode, DetailsSummary } from "./node";

// NodeView 는 editor 한정 — native <summary> 클릭이 ProseMirror state 와 동기되어 attrs.open 이 단일 출처.
// viewer 는 static-renderer 라 NodeView 미적용 — viewer.ts 가 DETAILS_NODES 를 그대로 export.
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
            if (event.type !== "click") return false;
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
