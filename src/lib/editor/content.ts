import type { JSONContent } from "@tiptap/react";
import { z } from "zod";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

const editorDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.unknown()).optional(),
});

export function emptyEditorContent(): JSONContent {
  return structuredClone(EMPTY_DOC);
}

// 백엔드는 PageGetResponse.content 를 string 으로 보관한다. JSON 직렬화·역직렬화는 프론트에서 맡고,
// 손상된 입력은 빈 문서로 fallback 한 뒤 저장 시 새 JSON 으로 덮어쓴다.
export function parseEditorContent(raw: string | undefined): JSONContent {
  if (raw === undefined || raw === "") return emptyEditorContent();
  try {
    const result = editorDocSchema.safeParse(JSON.parse(raw));
    return result.success ? (result.data as JSONContent) : emptyEditorContent();
  } catch {
    return emptyEditorContent();
  }
}

export function serializeEditorContent(json: JSONContent): string {
  return JSON.stringify(json);
}

// editor 인스턴스 없이 초기 상태에서 isEmpty 를 결정해야 할 때. TipTap getJSON 정규형 (빈 paragraph 한 개 또는 content 부재) 을 empty 로 본다.
export function isEmptyEditorContent(json: JSONContent): boolean {
  if (!json.content || json.content.length === 0) return true;
  if (json.content.length === 1) {
    const only = json.content[0];
    if (only.type === "paragraph" && (!only.content || only.content.length === 0)) return true;
  }
  return false;
}
