"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { CheckIcon, CopyIcon, EyeIcon, PencilIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getMermaid } from "@/lib/mermaid";

import { isRawPassthroughLanguage, normalizeLanguage, SUPPORTED_LANGUAGES } from "./lowlight";

export function CodeBlockNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = normalizeLanguage(node.attrs.language);
  const [copied, setCopied] = useState(false);
  // raw passthrough 언어 (mermaid) 는 미리보기/원본 두 모드 — 사용자가 SVG 결과를 즉시 확인.
  const [showPreview, setShowPreview] = useState(isRawPassthroughLanguage(language));
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const previewId = useId();
  const isMermaid = language === "mermaid";

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMermaid || !showPreview) return;
    const container = mermaidContainerRef.current;
    if (!container) return;
    let cancelled = false;
    void (async () => {
      const mermaid = await getMermaid();
      if (cancelled) return;
      try {
        const { svg } = await mermaid.render(
          `mermaid-preview-${previewId.replace(/[:]/g, "")}`,
          node.textContent,
        );
        if (!cancelled) container.innerHTML = svg;
      } catch (error) {
        if (cancelled) return;
        container.textContent = `Mermaid 문법 오류: ${error instanceof Error ? error.message : String(error)}`;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMermaid, showPreview, node.textContent, previewId]);

  const handleCopy = async () => {
    if (copied) return;
    // node.textContent 는 NodeView 가 render 된 시점의 snapshot. 사용자 입력 직후 NodeView re-render 전의 race 를 피해 DOM 에서 직접 읽는다.
    const text = preRef.current?.querySelector("code")?.textContent ?? node.textContent ?? "";
    if (text.trim() === "") {
      toast.info("복사할 내용이 없습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("코드를 복사했습니다.");
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1500);
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  return (
    <NodeViewWrapper
      data-language={language}
      className="code-block-wrapper bg-surface-elevated border-border hover:shadow-accent-glow relative my-3 overflow-hidden rounded-md border transition-shadow duration-200 ease-out"
    >
      <div className="text-muted-foreground flex items-center justify-between px-3 py-1.5 text-xs">
        {editor.isEditable ? (
          <Select value={language} onValueChange={(value) => updateAttributes({ language: value })}>
            <SelectTrigger
              size="sm"
              aria-label="코드 블록 언어"
              className="h-6 border-none bg-transparent px-2 text-xs shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="px-2">
            {SUPPORTED_LANGUAGES.find((lang) => lang.value === language)?.label ?? "Plain text"}
          </span>
        )}
        <div className="flex items-center gap-1">
          {isMermaid && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setShowPreview((v) => !v)}
              aria-label={showPreview ? "원본 코드 보기" : "다이어그램 미리보기"}
            >
              {showPreview ? <PencilIcon /> : <EyeIcon />}
              {showPreview ? "원본" : "미리보기"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            aria-label="코드 복사"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "복사됨" : "복사"}
          </Button>
        </div>
      </div>
      {isMermaid && showPreview ? (
        <>
          <div
            ref={mermaidContainerRef}
            className="mermaid-diagram flex items-center justify-center bg-transparent p-4"
            aria-live="polite"
          />
          {/* preview 모드에서도 ProseMirror 가 본문 텍스트를 관리해야 하므로 NodeViewContent 는 hidden 으로 유지. */}
          <pre ref={preRef} className="hidden">
            <NodeViewContent<"code"> as="code" />
          </pre>
        </>
      ) : (
        <pre ref={preRef} className="overflow-x-auto p-4 text-sm">
          {/* as="code" 는 제네릭 명시가 필요하다 — NodeViewContent 의 NoInfer 가 기본값 'div' 로 추론을 잠궈서. */}
          <NodeViewContent<"code"> as="code" className={`hljs language-${language}`} />
        </pre>
      )}
    </NodeViewWrapper>
  );
}
