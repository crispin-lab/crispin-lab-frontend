import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tagChipVariants = cva(
  "border-border bg-surface-elevated text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-5",
  {
    variants: {
      interactive: {
        true: "hover:text-foreground hover:shadow-accent-glow focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none transition-shadow duration-200 ease-out",
        false: "",
      },
      disabled: {
        true: "pointer-events-none opacity-60",
        false: "",
      },
    },
    defaultVariants: { interactive: false, disabled: false },
  },
);

type TagChipBaseProps = {
  name: string;
  /** chip 우측에 표시할 부가 정보 (예: usageCount). 시맨틱이 없는 보조 텍스트라 aria-hidden 으로 SR 노출 X. */
  trailing?: ReactNode;
  className?: string;
};

type TagChipLinkProps = TagChipBaseProps & {
  href: string;
  onRemove?: never;
  removeAriaLabel?: never;
  disabled?: never;
};

// href / onRemove 모두 생략 = display-only (인터랙션 없음). 검색 결과의 applied-tag 표시 등에서 사용 가능.
type TagChipDisplayProps = TagChipBaseProps & {
  href?: never;
  onRemove?: () => void;
  removeAriaLabel?: string;
  disabled?: boolean;
};

export type TagChipProps = TagChipLinkProps | TagChipDisplayProps;
export type TagChipVariants = VariantProps<typeof tagChipVariants>;

// BE 가 name 을 빈 문자열로 내려보낼 가능성은 거의 없지만, 그 경우 `#` 한 글자만 보이는 회귀를 막기 위한 fallback.
// `ui.md` "도메인 fallback 라벨" 절 정합 — italic 으로 *대체 표시* 임을 시각적으로 드러낸다.
function renderTagName(name: string) {
  if (name === "") return <span className="italic">이름 없는 태그</span>;
  return <span>#{name}</span>;
}

export function TagChip(props: TagChipProps) {
  if ("href" in props && props.href !== undefined) {
    const { name, href, trailing, className } = props;
    return (
      <Link href={href} className={cn(tagChipVariants({ interactive: true }), className)}>
        {renderTagName(name)}
        {trailing}
      </Link>
    );
  }

  const { name, onRemove, removeAriaLabel, disabled, trailing, className } = props;
  return (
    <span
      className={cn(tagChipVariants({ interactive: onRemove !== undefined, disabled }), className)}
    >
      {renderTagName(name)}
      {trailing}
      {onRemove !== undefined && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={
            removeAriaLabel ?? (name === "" ? "이름 없는 태그 제거" : `${name} 태그 제거`)
          }
          className="hover:text-foreground focus-visible:ring-ring text-muted-foreground/80 -mr-1 inline-flex size-4 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed"
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
    </span>
  );
}
