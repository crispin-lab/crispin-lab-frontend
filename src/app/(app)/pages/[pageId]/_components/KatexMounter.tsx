"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// 동적 import + 모듈 싱글톤 — 본문에 수식이 없으면 katex (~250KB) 가 첫 페이지 번들에 안 들어간다.
let katexPromise: Promise<typeof import("katex").default> | null = null;
function getKatex(): Promise<typeof import("katex").default> {
  if (katexPromise === null) {
    katexPromise = import("katex").then((mod) => mod.default);
  }
  return katexPromise;
}

// viewer (RSC static-renderer) 의 DOMOutputSpec 가 string 자식을 escape 해 raw KaTeX HTML 을 직접 박을 수 없어 분리.
// dataset.katexRendered 는 strict-mode 의 effect 더블 실행 중복 주입만 막는다.
export function KatexMounter({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>(
      '[data-type="inline-math"], [data-type="block-math"]',
    );
    if (nodes.length === 0) return;

    let cancelled = false;
    void (async () => {
      const katex = await getKatex();
      if (cancelled) return;
      nodes.forEach((node) => {
        if (node.dataset.katexRendered === "true") return;
        node.dataset.katexRendered = "true";
        const latex = node.dataset.latex ?? "";
        const displayMode = node.dataset.type === "block-math";
        try {
          node.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            errorColor: "var(--color-destructive)",
            displayMode,
            output: "html",
          });
        } catch {
          // throwOnError:false 라 보통 도달 안 함 — 도달 시 raw 텍스트로 남겨 본문 시각 회귀 회피.
          node.textContent = latex;
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
