import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

// 생성/편집 화면의 footer 외피 — 본문이 길어도 액션 버튼이 항상 viewport 안.
// -mx-6 + px-6 으로 wrapper 의 좌우 padding 을 채워 시각 분리, bg/95 + backdrop-blur 로 본문 비침 가독성 보호.
// 호출부 invariant — 직계 부모 wrapper 의 좌우 padding 이 `px-6` 이어야 한다. 다른 padding 의 wrapper 에서 쓰면
// -mx-6 가 정확히 끝까지 채우지 못해 시각이 깨진다. wrapper padding 다양화가 필요해지면 prop 으로 외부화.
export function StickyFormFooter({ children, className }: Props) {
  return (
    <div
      className={cn(
        "border-border bg-background/95 sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t px-6 py-4 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
