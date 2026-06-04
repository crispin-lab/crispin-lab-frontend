import type { JSONContent } from "@tiptap/react";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import Link from "next/link";

import { viewerExtensions } from "@/components/editor/extensions/viewer";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import type { Page } from "@/lib/api/types";
import { parseEditorContent } from "@/lib/editor/content";
import { cn } from "@/lib/utils";

import { PageLinkChipNavigator } from "./PageLinkChipNavigator";
import { PublicAppBar } from "./PublicAppBar";

type Props = {
  page: Page;
  isAuthenticated: boolean;
  className?: string;
};

type TocItem = { id: string; level: 1 | 2 | 3; text: string };

const TOC_MIN_HEADINGS = 3;

export function PageReadingView({ page, isAuthenticated, className }: Props) {
  const doc = parseEditorContent(page.content);
  // walking 한 번에 (a) TOC items 수집 + (b) heading 노드 attrs.id 부여. renderer 가 같은 doc 을 받아 id 를 그대로 출력.
  const headings = buildTocAndAssignIds(doc);
  const isBodyEmpty = !hasAnyText(doc);
  // `@tiptap/react` 의 generateHTML 은 document.implementation 의존이라 RSC 에서 throw — static-renderer 가 SSR 안전 대안.
  const html = isBodyEmpty
    ? ""
    : renderToHTMLString({ content: doc, extensions: viewerExtensions });
  const showToc = headings.length >= TOC_MIN_HEADINGS;
  const showUpdatedAt = new Date(page.updatedAt).getTime() !== new Date(page.createdAt).getTime();

  return (
    <div className={cn("min-h-screen", className)}>
      <PublicAppBar isAuthenticated={isAuthenticated} />
      <div
        className={cn(
          "mx-auto w-full max-w-3xl px-6 py-10",
          showToc && "lg:grid lg:max-w-5xl lg:grid-cols-[1fr_12rem] lg:gap-10",
        )}
      >
        <article className="min-w-0">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
            <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span>@{page.authorId}</span>
              <span aria-hidden>·</span>
              <time dateTime={page.createdAt}>{formatDate(page.createdAt)}</time>
              {showUpdatedAt && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={page.updatedAt}>수정 {formatDate(page.updatedAt)}</time>
                </>
              )}
              <span aria-hidden>·</span>
              <VisibilityBadge visibility={page.visibility} />
              {isAuthenticated && (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/pages/${page.pageId}/edit`}
                    className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    편집
                  </Link>
                </>
              )}
            </p>
          </header>

          {isBodyEmpty ? (
            <p className="text-muted-foreground italic">본문이 비어 있습니다.</p>
          ) : (
            <PageLinkChipNavigator>
              <div
                className={cn(
                  "prose-page leading-7",
                  "[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-semibold",
                  "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold",
                  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
                  "[&_p]:my-3",
                  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
                  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
                  "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
                  "[&_a]:text-accent [&_a]:underline",
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </PageLinkChipNavigator>
          )}
        </article>

        {showToc && <Toc items={headings} />}
      </div>
    </div>
  );
}

function Toc({ items }: { items: TocItem[] }) {
  return (
    <aside className="hidden lg:block">
      <nav aria-label="목차" className="sticky top-20">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          목차
        </p>
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item.id} className={tocIndentClass(item.level)}>
              <Link href={`#${item.id}`} className="text-muted-foreground hover:text-foreground">
                {item.text}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function tocIndentClass(level: 1 | 2 | 3): string {
  if (level === 1) return "pl-0";
  if (level === 2) return "pl-3";
  return "pl-6";
}

function buildTocAndAssignIds(doc: JSONContent): TocItem[] {
  const items: TocItem[] = [];
  const visit = (node: JSONContent) => {
    if (node.type === "heading") {
      const level = node.attrs?.level;
      const text = collectText(node);
      if ((level === 1 || level === 2 || level === 3) && text !== "") {
        const id = `toc-${items.length}`;
        node.attrs = { ...node.attrs, id };
        items.push({ id, level, text });
      }
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(doc);
  return items;
}

function collectText(node: JSONContent): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(collectText).join("");
}

function hasAnyText(node: JSONContent): boolean {
  if (typeof node.text === "string" && node.text !== "") return true;
  if (node.type === "pageLink") return true;
  return (node.content ?? []).some(hasAnyText);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}
