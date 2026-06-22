"use client";

import { CheckIcon, CopyIcon, EyeIcon, PencilIcon } from "lucide-react";
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

import { normalizeLanguage, type SupportedLanguage, SUPPORTED_LANGUAGES } from "./lowlight";

export type CodeBlockHeaderProps = {
  language: SupportedLanguage;
  editable: boolean;
  showMermaidPreview: boolean;
  onLanguageChange: (language: SupportedLanguage) => void;
  onToggleMermaidPreview: () => void;
  getText: () => string;
};

export function CodeBlockHeader({
  language,
  editable,
  showMermaidPreview,
  onLanguageChange,
  onToggleMermaidPreview,
  getText,
}: CodeBlockHeaderProps) {
  const isMermaid = language === "mermaid";
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (copied) return;
    const text = getText();
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

  const languageLabel =
    SUPPORTED_LANGUAGES.find((lang) => lang.value === language)?.label ?? "Plain text";

  return (
    <div className="text-muted-foreground flex items-center justify-between px-3 py-1.5 text-xs">
      {editable ? (
        <Select
          value={language}
          onValueChange={(value) => onLanguageChange(normalizeLanguage(value))}
        >
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
        <span className="px-2">{languageLabel}</span>
      )}
      <div className="flex items-center gap-1">
        {isMermaid && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onToggleMermaidPreview}
            aria-label={showMermaidPreview ? "원본 코드 보기" : "다이어그램 미리보기"}
          >
            {showMermaidPreview ? <PencilIcon /> : <EyeIcon />}
            {showMermaidPreview ? "원본" : "미리보기"}
          </Button>
        )}
        <Button type="button" variant="ghost" size="xs" onClick={handleCopy} aria-label="코드 복사">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
    </div>
  );
}
