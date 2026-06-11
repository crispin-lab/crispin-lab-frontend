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

    pres.forEach((pre) => {
      if (pre.dataset.copyEnhanced === "true") return;
      pre.dataset.copyEnhanced = "true";

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "코드 복사");
      button.textContent = "복사";
      // Tailwind JIT 가 동적 className 을 못 잡아 code-highlight.css 의 plain 클래스로.
      button.className = "code-block-copy-button";

      // 연속 클릭 시 이전 timer 를 덮어써야 마지막 클릭 기준 1.5s 가 보장된다.
      let copiedTimer: ReturnType<typeof setTimeout> | null = null;

      const handleClick = async () => {
        if (button.textContent === "복사됨") return;
        const code = pre.querySelector("code");
        const text = code?.textContent ?? "";
        if (text.trim() === "") {
          toast.info("복사할 내용이 없습니다.");
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "복사됨";
          toast.success("코드를 복사했습니다.");
          if (copiedTimer !== null) clearTimeout(copiedTimer);
          copiedTimer = setTimeout(() => {
            button.textContent = "복사";
            copiedTimer = null;
          }, 1500);
        } catch {
          toast.error("복사에 실패했습니다.");
        }
      };
      button.addEventListener("click", handleClick);
      pre.appendChild(button);

      cleanups.push(() => {
        if (copiedTimer !== null) clearTimeout(copiedTimer);
        button.removeEventListener("click", handleClick);
        button.remove();
        delete pre.dataset.copyEnhanced;
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return <div ref={ref}>{children}</div>;
}
