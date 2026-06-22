import { mergeAttributes, Node } from "@tiptap/core";

export type CalloutKind = "info" | "warn" | "tip";

const CALLOUT_KINDS: readonly CalloutKind[] = ["info", "warn", "tip"] as const;

function normalizeKind(raw: unknown): CalloutKind {
  return typeof raw === "string" && (CALLOUT_KINDS as readonly string[]).includes(raw)
    ? (raw as CalloutKind)
    : "info";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind: CalloutKind) => ReturnType;
      updateCalloutKind: (kind: CalloutKind) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

// defining: true — Backspace 가 빈 첫 위치에서 callout 을 풀어 paragraph 로 환원.
// 시각은 div + data-callout / data-kind 위에 prose CSS 만 — NodeView 없음.
export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "info" as CalloutKind,
        parseHTML: (element) => normalizeKind(element.getAttribute("data-kind")),
        renderHTML: (attrs) => ({ "data-kind": normalizeKind(attrs.kind) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-callout": "", class: "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (kind) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { kind }),
      updateCalloutKind:
        (kind) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { kind }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export { CALLOUT_KINDS, normalizeKind };
