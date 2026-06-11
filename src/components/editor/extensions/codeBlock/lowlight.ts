import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { createLowlight } from "lowlight";

// common (190+ 언어) 대신 명시 register 로 번들 사이즈 절약.
export const lowlight = createLowlight();

lowlight.register({
  typescript,
  tsx: typescript,
  javascript,
  jsx: javascript,
  bash,
  json,
  css,
  html: xml,
  markdown,
  sql,
});

export const SUPPORTED_LANGUAGES = [
  { value: "text", label: "Plain text" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "javascript", label: "JavaScript" },
  { value: "jsx", label: "JSX" },
  { value: "bash", label: "Bash" },
  { value: "json", label: "JSON" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

export function normalizeLanguage(raw: unknown): SupportedLanguage {
  if (typeof raw !== "string") return "text";
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.value === raw);
  return match?.value ?? "text";
}
