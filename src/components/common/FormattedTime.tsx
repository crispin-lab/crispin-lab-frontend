"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Variant = "date" | "datetime";

type Props = {
  iso: string;
  variant?: Variant;
  className?: string;
};

const FORMATTERS: Record<Variant, Intl.DateTimeFormat> = {
  date: new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }),
  // hourCycle "h23" 명시 — ko-KR 기본 h12 는 오전/오후 접두를 붙여 placeholder 폭과 어긋난다.
  datetime: new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }),
};

// hydration 시 폭 급변으로 인한 layout shift 를 최종 포맷과 같은 폭의 invisible placeholder 로 예약.
// formatter 옵션이 바뀌어도 placeholder 폭이 자동으로 맞도록 formatToParts 로 파생 — 숫자 파트는 자리수만큼 "0" 채움.
const PLACEHOLDERS: Record<Variant, string> = {
  date: derivePlaceholder(FORMATTERS.date),
  datetime: derivePlaceholder(FORMATTERS.datetime),
};

function derivePlaceholder(fmt: Intl.DateTimeFormat): string {
  return fmt
    .formatToParts(new Date(0))
    .map((part) => (part.type === "literal" ? part.value : "0".repeat(part.value.length)))
    .join("");
}

export function FormattedTime({ iso, variant = "date", className }: Props) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} className={cn("tabular-nums", className)}>
      {hydrated ? (
        formatIso(iso, variant)
      ) : (
        <span aria-hidden className="invisible">
          {PLACEHOLDERS[variant]}
        </span>
      )}
    </time>
  );
}

// 서버는 클라이언트 timezone 을 모른다 — hydration 이전 false 로 렌더를 미루고, 이후 true 로 스냅샷 스위치.
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
}

function subscribeNoop(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function formatIso(iso: string, variant: Variant): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return FORMATTERS[variant].format(date);
}
