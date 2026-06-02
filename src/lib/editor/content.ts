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
