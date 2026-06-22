"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { getMermaid } from "@/lib/mermaid";

type Props = {
  children: ReactNode;
};

// dataset.mermaidRendered 는 strict-mode 의 effect 더블 실행 중복 주입만 막는다.
export function MermaidMounter({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const pres = root.querySelectorAll<HTMLPreElement>('pre[data-mermaid="true"]');
    if (pres.length === 0) return;

    let cancelled = false;

    void (async () => {
      const mermaid = await getMermaid();
      if (cancelled) return;
      for (const pre of pres) {
        if (pre.dataset.mermaidRendered === "true") continue;
        pre.dataset.mermaidRendered = "true";
        const source = pre.querySelector("code")?.textContent ?? "";
        if (source.trim() === "") continue;
        try {
          // mermaid 가 SVG 내부 defs id 에 그대로 박는다 — 동시 mount 충돌 방지로 UUID.
          const id = `mermaid-${crypto.randomUUID()}`;
          const { svg } = await mermaid.render(id, source);
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-diagram";
          wrapper.innerHTML = svg;
          pre.replaceWith(wrapper);
        } catch {
          // 렌더 실패는 원본 pre 그대로 — 사용자가 잘못된 문법을 본문에서 바로 확인 가능. rendered 마킹은 해제해 재시도 여지를 둔다.
          delete pre.dataset.mermaidRendered;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
