"use client";

import type { Editor, NodeViewRendererProps } from "@tiptap/core";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { createRoot, type Root } from "react-dom/client";

import { getMermaid } from "@/lib/mermaid";

import { CodeBlockHeader } from "./CodeBlockHeader";
import { dispatchCmChangesToPm, FROM_CM_META, syncPmTextToCm } from "./codemirror/bridge";
import { loadLanguageSupport } from "./codemirror/languages";
import { buildCodeBlockExtensions } from "./codemirror/setup";
import { isRawPassthroughLanguage, normalizeLanguage, type SupportedLanguage } from "./lowlight";

// 본 NodeView 의 책임 경계 / PM ↔ CM bridge 의 invariant 는 `.claude/rules/editor.md` 의 "코드 블록 — CodeMirror NodeView" 절.
export class CodeBlockView {
  readonly dom: HTMLElement;
  readonly contentDOM = null;

  private node: ProseMirrorNode;
  private readonly editor: Editor;
  private readonly getPos: () => number | undefined;

  private readonly cmContainer: HTMLDivElement;
  private readonly headerContainer: HTMLDivElement;
  private mermaidContainer: HTMLDivElement | null = null;

  private cmView: EditorView | null = null;
  private readonly headerRoot: Root;

  private readonly languageCompartment = new Compartment();
  private readonly editableCompartment = new Compartment();

  private currentLanguage: SupportedLanguage;
  private showMermaidPreview: boolean;
  private inComposition = false;
  private readonly mermaidId: string;

  // language load / mermaid render 의 비동기 race 가드 — 마지막 요청만 결과 반영.
  private languageSeq = 0;
  private mermaidRenderSeq = 0;

  constructor(props: NodeViewRendererProps) {
    this.node = props.node;
    this.editor = props.editor;
    this.getPos = props.getPos;
    this.mermaidId = `mermaid-cb-${crypto.randomUUID()}`;

    this.currentLanguage = normalizeLanguage(props.node.attrs.language);
    this.showMermaidPreview = isRawPassthroughLanguage(this.currentLanguage);

    this.dom = document.createElement("div");
    this.dom.className =
      "code-block-wrapper bg-surface-elevated border-border hover:shadow-accent-glow relative my-3 overflow-hidden rounded-md border transition-shadow duration-200 ease-out";
    this.dom.setAttribute("data-language", this.currentLanguage);

    this.headerContainer = document.createElement("div");
    this.dom.appendChild(this.headerContainer);

    this.cmContainer = document.createElement("div");
    this.dom.appendChild(this.cmContainer);

    this.headerRoot = createRoot(this.headerContainer);
    this.renderHeader();

    if (this.isMermaidPreviewActive()) {
      this.mountMermaid();
    } else {
      this.mountCm();
    }
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    const prevNode = this.node;
    this.node = node;

    const newLanguage = normalizeLanguage(node.attrs.language);
    const languageChanged = newLanguage !== this.currentLanguage;
    if (languageChanged) {
      const wasMermaid = this.currentLanguage === "mermaid";
      this.currentLanguage = newLanguage;
      this.dom.setAttribute("data-language", newLanguage);
      if (newLanguage === "mermaid" && !wasMermaid) {
        this.showMermaidPreview = true;
      } else if (newLanguage !== "mermaid") {
        this.showMermaidPreview = false;
      }
      void this.reconfigureLanguage(newLanguage);
    }

    const shouldShowPreview = this.isMermaidPreviewActive();
    const previewMounted = this.mermaidContainer !== null;
    if (shouldShowPreview && !previewMounted) {
      this.unmountCm();
      this.mountMermaid();
    } else if (!shouldShowPreview && previewMounted) {
      this.unmountMermaid();
      this.mountCm();
    } else if (shouldShowPreview && previewMounted) {
      if (prevNode.textContent !== node.textContent) {
        void this.renderMermaidSvg();
      }
    }

    if (this.cmView) {
      syncPmTextToCm({ cmView: this.cmView, newText: node.textContent });
      this.reconfigureEditable();
    }

    this.renderHeader();
    return true;
  }

  // CM contentEditable 안의 이벤트가 PM 으로 새지 않게.
  stopEvent(event: Event): boolean {
    return event.target instanceof Node && this.cmContainer.contains(event.target);
  }

  // 단수형이 PM 의 NodeView API. selection mutation 도 무시 — PM → CM selection sync 는 v1 defer.
  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.unmountCm();
    this.unmountMermaid();
    // React 18+ "synchronously unmount a root inside a render" 경고 회피.
    queueMicrotask(() => {
      try {
        this.headerRoot.unmount();
      } catch {
        // already unmounted.
      }
    });
  }

  private mountCm(): void {
    if (this.cmView) return;
    const extensions = buildCodeBlockExtensions({
      editor: this.editor,
      getPos: this.getPos,
      compartments: {
        language: this.languageCompartment,
        editable: this.editableCompartment,
      },
      isEditable: this.editor.isEditable,
    });
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (this.inComposition) return;
        dispatchCmChangesToPm({ editor: this.editor, getPos: this.getPos, update });
      }),
      EditorView.domEventHandlers({
        compositionstart: () => {
          this.inComposition = true;
        },
        compositionend: () => {
          this.inComposition = false;
          this.flushTextToPm();
        },
      }),
    );
    const state = EditorState.create({
      doc: this.node.textContent,
      extensions,
    });
    this.cmView = new EditorView({ state, parent: this.cmContainer });
    this.cmContainer.style.display = "";
    void this.reconfigureLanguage(this.currentLanguage);
  }

  private unmountCm(): void {
    this.cmView?.destroy();
    this.cmView = null;
    this.cmContainer.style.display = "none";
  }

  private async reconfigureLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.cmView) return;
    const seq = ++this.languageSeq;
    const ext = await loadLanguageSupport(language);
    if (!this.cmView) return;
    if (seq !== this.languageSeq) return;
    this.cmView.dispatch({
      effects: this.languageCompartment.reconfigure(ext),
    });
  }

  private reconfigureEditable(): void {
    if (!this.cmView) return;
    const isEditable = this.editor.isEditable;
    this.cmView.dispatch({
      effects: this.editableCompartment.reconfigure([
        EditorView.editable.of(isEditable),
        EditorState.readOnly.of(!isEditable),
      ]),
    });
  }

  // compositionend 에서 누적 입력을 단일 ReplaceStep 으로 — IME 의 자모 단위가 history 에 흩어지지 않게.
  private flushTextToPm(): void {
    if (!this.cmView) return;
    const finalText = this.cmView.state.doc.toString();
    if (finalText === this.node.textContent) return;
    const pos = this.getPos();
    if (pos == null) return;
    const tr = this.editor.view.state.tr;
    const from = pos + 1;
    const to = pos + this.node.nodeSize - 1;
    if (finalText.length === 0) {
      tr.delete(from, to);
    } else {
      tr.replaceWith(from, to, this.editor.view.state.schema.text(finalText));
    }
    tr.setMeta(FROM_CM_META, true);
    this.editor.view.dispatch(tr);
  }

  private isMermaidPreviewActive(): boolean {
    return this.currentLanguage === "mermaid" && this.showMermaidPreview;
  }

  private mountMermaid(): void {
    if (this.mermaidContainer) return;
    this.cmContainer.style.display = "none";
    const container = document.createElement("div");
    container.className = "mermaid-diagram flex items-center justify-center bg-transparent p-4";
    container.setAttribute("aria-live", "polite");
    this.mermaidContainer = container;
    this.dom.appendChild(container);
    void this.renderMermaidSvg();
  }

  private unmountMermaid(): void {
    if (!this.mermaidContainer) return;
    this.mermaidContainer.remove();
    this.mermaidContainer = null;
  }

  private async renderMermaidSvg(): Promise<void> {
    const container = this.mermaidContainer;
    if (!container) return;
    const seq = ++this.mermaidRenderSeq;
    try {
      const mermaid = await getMermaid();
      if (this.mermaidContainer !== container || seq !== this.mermaidRenderSeq) return;
      const source = this.node.textContent;
      // 같은 id 로 동시 render 시 mermaid 내부 DOM cleanup 이 race — seq 섞어 매 호출 unique.
      const renderId = `${this.mermaidId}-${seq}`;
      const { svg } = await mermaid.render(renderId, source);
      if (this.mermaidContainer === container && seq === this.mermaidRenderSeq) {
        container.innerHTML = svg;
      }
    } catch (error) {
      if (this.mermaidContainer === container && seq === this.mermaidRenderSeq) {
        container.textContent = `Mermaid 문법 오류: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  private renderHeader(): void {
    this.headerRoot.render(
      <CodeBlockHeader
        language={this.currentLanguage}
        editable={this.editor.isEditable}
        showMermaidPreview={this.showMermaidPreview && this.currentLanguage === "mermaid"}
        onLanguageChange={this.handleLanguageChange}
        onToggleMermaidPreview={this.handleToggleMermaidPreview}
        getText={this.getText}
      />,
    );
  }

  private readonly handleLanguageChange = (language: SupportedLanguage): void => {
    const pos = this.getPos();
    if (pos == null) return;
    const docState = this.editor.view.state;
    // this.node.attrs 는 PM 트랜잭션 간 stale 가능 — 매 호출 fresh read.
    const currentNode = docState.doc.nodeAt(pos);
    if (!currentNode) return;
    const tr = docState.tr.setNodeMarkup(pos, undefined, {
      ...currentNode.attrs,
      language,
    });
    this.editor.view.dispatch(tr);
  };

  private readonly handleToggleMermaidPreview = (): void => {
    if (this.currentLanguage !== "mermaid") return;
    this.showMermaidPreview = !this.showMermaidPreview;
    const shouldShowPreview = this.isMermaidPreviewActive();
    const previewMounted = this.mermaidContainer !== null;
    if (shouldShowPreview && !previewMounted) {
      this.unmountCm();
      this.mountMermaid();
    } else if (!shouldShowPreview && previewMounted) {
      this.unmountMermaid();
      this.mountCm();
    }
    this.renderHeader();
  };

  private readonly getText = (): string => {
    return this.cmView?.state.doc.toString() ?? this.node.textContent ?? "";
  };
}
