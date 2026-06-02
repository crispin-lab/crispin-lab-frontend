"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Editor } from "@/components/editor/Editor";
import { TitleInput } from "@/components/page/TitleInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageCreate } from "@/hooks/usePage";
import { type SpaceId } from "@/lib/api/ids";
import { toUserMessage } from "@/lib/api/errors";
import { emptyEditorContent, serializeEditorContent } from "@/lib/editor/content";
import {
  VISIBILITY_VALUES,
  type Visibility,
  isVisibility,
  visibilityDescription,
  visibilityLabel,
} from "@/lib/page/visibility";

type Props = {
  spaceId: SpaceId;
};

const DEFAULT_VISIBILITY: Visibility = "DRAFT";

export function NewPageView({ spaceId }: Props) {
  const router = useRouter();
  const { mutate, isPending } = usePageCreate();

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [content, setContent] = useState(() => serializeEditorContent(emptyEditorContent()));

  function handleVisibilityChange(value: string | null) {
    if (value !== null && isVisibility(value)) setVisibility(value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === "" || isPending) return;
    mutate(
      { spaceId, title, content, visibility },
      {
        onSuccess: (result) => {
          router.push(`/pages/${result.pageId}`);
        },
        onError: (mutationError) => {
          if (mutationError.status === 401 && mutationError.code === "INVALID_SESSION") return;
          toast.error(toUserMessage(mutationError));
        },
      },
    );
  }

  const canSubmit = title.trim() !== "" && !isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10"
      noValidate
    >
      <h1 className="sr-only">새 페이지</h1>

      <div className="space-y-2">
        <Label
          htmlFor="new-page-visibility-trigger"
          className="text-muted-foreground text-xs uppercase"
        >
          공개 범위
        </Label>
        <Select value={visibility} onValueChange={handleVisibilityChange} disabled={isPending}>
          <SelectTrigger id="new-page-visibility-trigger" aria-label="공개 범위">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {visibilityLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{visibilityDescription(visibility)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-page-title" className="sr-only">
          제목
        </Label>
        <TitleInput
          id="new-page-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isPending}
          required
          placeholder="제목을 입력해 주세요"
        />
      </div>

      <Editor spaceId={spaceId} onChange={setContent} />

      <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? "만드는 중..." : "만들기"}
        </Button>
      </div>
    </form>
  );
}
