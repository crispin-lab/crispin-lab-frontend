import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";

// common preset 통째로 (수십 언어) 가져오지 않고 명시 register — 번들에 들어가는 highlight.js grammar 모듈을 우리가 쓰는 것만.
export const lowlight = createLowlight();

// toml 은 highlight.js 11 에서 단일 모듈로 없고 ini 가 TOML 슈퍼셋이라 같은 grammar 를 toml 키로도 등록.
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
  python,
  yaml,
  java,
  kotlin,
  dockerfile,
  toml: ini,
});

// mermaid 는 highlight.js 에 없어 별도 렌더 경로 — RAW_PASSTHROUGH_LANGUAGES 로 분기, MermaidMounter 가 client SVG hydrate.
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
  { value: "python", label: "Python" },
  { value: "yaml", label: "YAML" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "toml", label: "TOML" },
  { value: "mermaid", label: "Mermaid" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

export const RAW_PASSTHROUGH_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set(["mermaid"]);

export function normalizeLanguage(raw: unknown): SupportedLanguage {
  if (typeof raw !== "string") return "text";
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.value === raw);
  return match?.value ?? "text";
}

export function isRawPassthroughLanguage(language: SupportedLanguage): boolean {
  return RAW_PASSTHROUGH_LANGUAGES.has(language);
}
