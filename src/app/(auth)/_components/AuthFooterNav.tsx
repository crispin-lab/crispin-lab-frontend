import Link from "next/link";

import { cn } from "@/lib/utils";

type FooterLink = { href: string; label: string };

type Props = {
  links: ReadonlyArray<FooterLink>;
  className?: string;
};

export function AuthFooterNav({ links, className }: Props) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)}>
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? " · " : null}
          <Link href={link.href} className="hover:text-foreground transition-colors">
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
