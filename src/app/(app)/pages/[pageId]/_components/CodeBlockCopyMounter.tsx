"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";

type Props = {
  children: ReactNode;
};

// 본문 HTML 의 각 <pre> 에 복사 버튼을 부착. 호출부 (PageReadingView) 는 본문이 바뀌면 key 로 remount 시켜 effect 가 새 DOM 에 다시 돌게 한다.
// dataset 가드는 React strict-mode 의 effect 더블 실행으로 같은 mount 내 중복 주입만 막는다.
export function CodeBlockCopyMounter({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const pres = root.querySelectorAll<HTMLPreElement>("pre");
    const cleanups: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    pres.forEach((pre) => {
      if (pre.dataset.copyEnhanced === "true") return;
      pre.dataset.copyEnhanced = "true";

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "코드 복사");
      button.textContent = "복사";
      // Tailwind JIT 가 동적 className 을 못 잡아 code-highlight.css 의 plain 클래스로.
      button.className = "code-block-copy-button";

      const handleClick = async () => {
        const code = pre.querySelector("code");
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.textContent ?? "");
          button.textContent = "복사됨";
          toast.success("코드를 복사했습니다.");
          const timer = setTimeout(() => {
            button.textContent = "복사";
            timers.delete(timer);
          }, 1500);
          timers.add(timer);
        } catch {
          toast.error("복사에 실패했습니다.");
        }
      };
      button.addEventListener("click", handleClick);
      pre.appendChild(button);

      cleanups.push(() => {
        button.removeEventListener("click", handleClick);
        button.remove();
        delete pre.dataset.copyEnhanced;
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
