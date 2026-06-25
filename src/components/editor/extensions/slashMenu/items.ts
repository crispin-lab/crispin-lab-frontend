import type { Editor, Range } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  AlertTriangleIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  CodeIcon,
  FunctionSquareIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  InfoIcon,
  LightbulbIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  NetworkIcon,
  PilcrowIcon,
  QuoteIcon,
  StickyNoteIcon,
  TableIcon,
  type LucideIcon,
} from "lucide-react";

import { CALLOUT_KINDS, type CalloutKind } from "../callout/node";
import { appendFootnoteItem } from "../footnote/appendItem";

// command 는 자기 안에서 deleteRange(range) + 본문 action 을 같은 chain 으로 — slash 흔적 제거 책임을 호출자에 떠넘기지 않는다.
export type SlashItem = {
  key: string;
  label: string;
  keywords: string[];
  hint?: string;
  icon: LucideIcon;
  command: (ctx: { editor: Editor; range: Range }) => void;
};

function setCalloutItem(kind: CalloutKind): SlashItem {
  const labels: Record<CalloutKind, { label: string; hint: string; icon: LucideIcon }> = {
    info: { label: "콜아웃 (정보)", hint: "info", icon: InfoIcon },
    warn: { label: "콜아웃 (경고)", hint: "warn", icon: AlertTriangleIcon },
    tip: { label: "콜아웃 (팁)", hint: "tip", icon: LightbulbIcon },
  };
  return {
    key: `callout-${kind}`,
    label: labels[kind].label,
    keywords: ["callout", "콜아웃", kind, labels[kind].hint],
    hint: labels[kind].hint,
    icon: labels[kind].icon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout(kind).run();
    },
  };
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    key: "paragraph",
    label: "단락",
    keywords: ["paragraph", "단락", "본문"],
    icon: PilcrowIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    key: "heading-1",
    label: "제목 1",
    keywords: ["h1", "heading", "제목"],
    hint: "H1",
    icon: Heading1Icon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    key: "heading-2",
    label: "제목 2",
    keywords: ["h2", "heading", "제목"],
    hint: "H2",
    icon: Heading2Icon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    key: "heading-3",
    label: "제목 3",
    keywords: ["h3", "heading", "제목"],
    hint: "H3",
    icon: Heading3Icon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    key: "bullet-list",
    label: "순서 없는 목록",
    keywords: ["ul", "list", "목록"],
    icon: ListIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    key: "ordered-list",
    label: "순서 있는 목록",
    keywords: ["ol", "list", "목록"],
    icon: ListOrderedIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    key: "task-list",
    label: "체크리스트",
    keywords: ["task", "todo", "체크"],
    icon: CheckSquareIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    key: "blockquote",
    label: "인용",
    keywords: ["quote", "blockquote", "인용"],
    icon: QuoteIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    key: "code-block",
    label: "코드 블록",
    keywords: ["code", "코드"],
    icon: CodeIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    key: "table",
    label: "표",
    keywords: ["table", "표"],
    icon: TableIcon,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  ...CALLOUT_KINDS.map(setCalloutItem),
  {
    key: "math-block",
    label: "수식 블록",
    keywords: ["math", "katex", "수식", "공식"],
    icon: FunctionSquareIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertBlockMath({ latex: "x^2" }).run();
    },
  },
  {
    key: "mermaid",
    label: "Mermaid 다이어그램",
    keywords: ["mermaid", "diagram", "다이어그램"],
    icon: NetworkIcon,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "codeBlock",
          attrs: { language: "mermaid" },
          content: [{ type: "text", text: "graph TD;\n  A-->B;" }],
        })
        .run();
    },
  },
  {
    key: "footnote",
    label: "각주",
    keywords: ["footnote", "각주"],
    icon: StickyNoteIcon,
    command: ({ editor, range }) => {
      // 새 ref 의 doc-order ordinal 과 같은 자리에 item 을 insert — 항상 끝에 append 하면 numbering 재할당 시
      // ref ↔ item 의 number 짝이 깨진다 (앞쪽 caret 에 ref 가 들어가면 작은 번호인데 item 은 끝이라 큰 번호).
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "footnoteReference", attrs: { number: 1 } })
        .command(({ tr }) => {
          // insertContent 가 inline atom 뒤 (size 1) 로 selection 을 옮기므로 새 ref 의 시작 위치는 selection.from - 1.
          const newRefPos = tr.selection.from - 1;
          let ordinal = 0;
          tr.doc.descendants((node, pos) => {
            if (node.type.name === "footnoteReference" && pos < newRefPos) ordinal += 1;
            return true;
          });
          const result = appendFootnoteItem(tr, tr.doc.type.schema, ordinal);
          if (result === null) return false;
          tr.setSelection(TextSelection.near(tr.doc.resolve(result.itemParagraphPos)));
          return true;
        })
        .run();
    },
  },
  {
    key: "details",
    label: "접기/펴기",
    keywords: ["details", "toggle", "접기"],
    icon: ChevronRightIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setDetails().run();
    },
  },
  {
    key: "hr",
    label: "구분선",
    keywords: ["hr", "horizontal", "rule", "구분선"],
    icon: MinusIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") return SLASH_ITEMS;
  return SLASH_ITEMS.filter((item) => {
    if (item.label.toLowerCase().includes(normalized)) return true;
    if (item.key.includes(normalized)) return true;
    return item.keywords.some((kw) => kw.toLowerCase().includes(normalized));
  });
}
