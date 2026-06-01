import Link from "next/link";

import { cn } from "@/lib/utils";

type FooterLink = { href: string; label: string };

type Props = {
  links: ReadonlyArray<FooterLink>;
  className?: string;
};

export function AuthFooterNav({ links, className }: Props) {
  return (
    <nav aria-label="인증 보조 링크" className={cn("text-muted-foreground text-sm", className)}>
      <ul className="flex flex-wrap items-center gap-2">
        {links.map((link, index) => (
          <li key={link.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            <Link href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
