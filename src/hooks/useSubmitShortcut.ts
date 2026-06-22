import { useEffect, useRef, type RefObject } from "react";

// Cmd/Ctrl+S 단축키로 submit 을 트리거. ref 로 latest closure 캡처 — listener 재부착 비용 회피.
// IME composition 가드 + preventDefault (브라우저 native "페이지 저장" 다이얼로그 차단) 가 공통 invariant.
//
// containerRef 가 주어지면 *그 element 내부에서 발생한 keydown 만* submit 을 트리거한다. portal 로 떠 있는
// dialog / popover / select dropdown 같은 overlay 안의 keydown 은 자동으로 제외 — 사용자가 modal 안에서
// 부주의하게 단축키를 누르는 시나리오로부터 백그라운드 mutation 발화를 차단한다.
export function useSubmitShortcut(
  submit: () => void,
  containerRef?: RefObject<HTMLElement | null>,
): void {
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSave = (event.metaKey || event.ctrlKey) && event.key === "s";
      if (!isSave) return;
      if (event.isComposing) return;
      if (containerRef !== undefined) {
        const container = containerRef.current;
        const target = event.target;
        // container.current === null 시점 (mount 직후 첫 paint 전) 의 keydown 은 의도적으로 무발화 —
        // ref 가 attach 되기 전이라 *어디서 발생했는지* 판단 불가하므로 보수적으로 보류.
        if (container === null || !(target instanceof Node) || !container.contains(target)) return;
      }
      event.preventDefault();
      submitRef.current?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef]);
}
