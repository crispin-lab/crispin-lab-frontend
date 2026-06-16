import type { JSONContent } from "@tiptap/react";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import Link from "next/link";

import { viewerExtensions } from "@/components/editor/extensions/viewer";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import type { Page } from "@/lib/api/types";
import { parseEditorContent } from "@/lib/editor/content";
import { cn } from "@/lib/utils";

import { CodeBlockCopyMounter } from "./CodeBlockCopyMounter";
import { PageLinkChipNavigator } from "./PageLinkChipNavigator";
import { Toc, type TocItem } from "./Toc";

type Props = {
  page: Page;
  isAuthenticated: boolean;
  className?: string;
};

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
    <div className={className}>
      <div
        className={cn(
          "mx-auto w-full max-w-3xl px-6 py-10",
          showToc && "lg:grid lg:max-w-5xl lg:grid-cols-[1fr_12rem] lg:gap-10",
        )}
      >
        <article className="min-w-0">
          <header className="mb-8">
            <h1 className="bg-gradient-to-r from-(--heading-gradient-start) to-(--heading-gradient-end) bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
              {page.title}
            </h1>
            <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {/* schema 의 authorHandle description: 삭제된 사용자의 경우 빈 문자열. falsy 도 같이 흡수해 `@undefined` 회귀를 막는다. */}
              {!page.authorHandle ? (
                <span className="text-muted-foreground italic">삭제된 사용자</span>
              ) : (
                <span className="text-accent-secondary">@{page.authorHandle}</span>
              )}
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
              {/* updatedAt 변경 시 mounter 를 remount 해 새 본문 HTML 에 복사 버튼을 다시 부착. */}
              <CodeBlockCopyMounter key={page.updatedAt}>
                {/* inline-code 스타일은 code-highlight.css 의 `.prose-page :not(pre) > code` 에서 담당. */}
                <div
                  className={cn(
                    "prose-page leading-8",
                    "[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:bg-gradient-to-r [&_h1]:from-(--heading-gradient-start) [&_h1]:to-(--heading-gradient-end) [&_h1]:bg-clip-text [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-transparent",
                    "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold",
                    "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
                    "[&_p]:my-3",
                    "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
                    "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
                    "[&_a]:text-accent [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-2 [&_a]:transition-all [&_a]:duration-200 [&_a]:ease-out",
                    "[&_a:hover]:decoration-2 [&_a:hover]:underline-offset-4",
                  )}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </CodeBlockCopyMounter>
            </PageLinkChipNavigator>
          )}
        </article>

        {showToc && <Toc items={headings} />}
      </div>
    </div>
  );
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
