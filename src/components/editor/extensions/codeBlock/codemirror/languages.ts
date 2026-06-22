import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";

import type { SupportedLanguage } from "../lowlight";

// SUPPORTED_LANGUAGES 의 도메인 값 → language-data 의 정식 이름. null 은 plaintext (text / mermaid).
const LANGUAGE_NAME_MAP: Record<SupportedLanguage, string | null> = {
  text: null,
  typescript: "TypeScript",
  tsx: "TSX",
  javascript: "JavaScript",
  jsx: "JSX",
  bash: "Shell",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  sql: "SQL",
  python: "Python",
  yaml: "YAML",
  java: "Java",
  kotlin: "Kotlin",
  dockerfile: "Dockerfile",
  toml: "TOML",
  mermaid: null,
};

const supportCache = new Map<SupportedLanguage, Extension[]>();

export async function loadLanguageSupport(name: SupportedLanguage): Promise<Extension[]> {
  const cached = supportCache.get(name);
  if (cached) return cached;
  const mapped = LANGUAGE_NAME_MAP[name];
  if (mapped === null) {
    supportCache.set(name, []);
    return [];
  }
  const desc = LanguageDescription.matchLanguageName(languages, mapped, true);
  if (!desc) {
    supportCache.set(name, []);
    return [];
  }
  try {
    const support = await desc.load();
    const ext: Extension[] = [support];
    supportCache.set(name, ext);
    return ext;
  } catch (error) {
    // grammar chunk 로드 실패 (네트워크 / 빌드 누락) — plaintext fallback. 캐시는 하지 않아 재시도 가능.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[codeBlock] language grammar load failed for "${name}":`, error);
    }
    return [];
  }
}
