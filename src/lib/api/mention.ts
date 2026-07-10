import type { MentionContext } from "@/lib/mention/context";

import { apiFetch } from "./client";
import { asUserId } from "./ids";
import type { CompositionComponents, MentionCandidateResult } from "./types";

export type MentionSearchParams = {
  query: string;
  size?: number;
  context: MentionContext;
};

type RawMentionCandidateResponse = CompositionComponents["schemas"]["MentionCandidateGetResponse"];

export async function searchMentionCandidates(
  params: MentionSearchParams,
  signal?: AbortSignal,
): Promise<MentionCandidateResult> {
  const { context } = params;
  const search = new URLSearchParams();
  search.append("query", params.query);
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  search.append("spaceId", context.spaceId);
  search.append("spaceVisibility", context.spaceVisibility);
  search.append("pageVisibility", context.pageVisibility);
  search.append("pageAuthorId", context.pageAuthorId);

  const raw = await apiFetch<RawMentionCandidateResponse>(
    `/api/v1/mention-candidates?${search.toString()}`,
    { signal },
  );
  return {
    items: raw.items.map((item) => ({
      userId: asUserId(item.userId),
      handle: item.handle,
    })),
  };
}
