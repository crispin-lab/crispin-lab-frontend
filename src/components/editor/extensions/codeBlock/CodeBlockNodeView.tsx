"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { normalizeLanguage, SUPPORTED_LANGUAGES } from "./lowlight";

export function CodeBlockNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = normalizeLanguage(node.attrs.language);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    // node.textContent 는 NodeView 가 render 된 시점의 snapshot. 사용자 입력 직후 NodeView re-render 전의 race 를 피해 DOM 에서 직접 읽는다.
    const text = preRef.current?.querySelector("code")?.textContent ?? "";
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
      className="code-block-wrapper bg-muted relative my-3 overflow-hidden rounded-md"
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
        <Button type="button" variant="ghost" size="xs" onClick={handleCopy} aria-label="코드 복사">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <pre ref={preRef} className="overflow-x-auto p-4 text-sm">
        {/* as="code" 는 제네릭 명시가 필요하다 — NodeViewContent 의 NoInfer 가 기본값 'div' 로 추론을 잠궈서. */}
        <NodeViewContent<"code"> as="code" className={`hljs language-${language}`} />
      </pre>
    </NodeViewWrapper>
  );
}
