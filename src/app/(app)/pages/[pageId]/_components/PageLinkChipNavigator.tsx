"use client";

import { useRouter } from "next/navigation";
import { useCallback, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PageLinkChipNavigator({ children, className }: Props) {
  const router = useRouter();

  const navigate = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      // 편집 영역 (TipTap ProseMirror) 안의 chip click 은 caret 이동 의도 — navigation 하면 작성 중인 내용이 사라진다.
      if (target.closest('.ProseMirror, [contenteditable="true"]')) return false;
      const chip = target.closest("[data-page-link]");
      if (!chip) return false;
      const pageId = chip.getAttribute("data-page-id");
      if (!pageId) return false;
      router.push(`/pages/${encodeURIComponent(pageId)}`);
      return true;
    },
    [router],
  );

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (navigate(event.target)) event.stopPropagation();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    if (navigate(event.target)) event.stopPropagation();
  }

  return (
    <div className={cn(className)} onClick={handleClick} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}
