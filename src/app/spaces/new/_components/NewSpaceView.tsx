"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSpaceCreate } from "@/hooks/useSpace";
import { asSpaceId } from "@/lib/api/ids";
import { toUserMessage } from "@/lib/api/errors";
import {
  SPACE_VISIBILITY_VALUES,
  type SpaceVisibility,
  isSpaceVisibility,
  spaceVisibilityDescription,
  spaceVisibilityLabel,
} from "@/lib/space/visibility";

const DEFAULT_VISIBILITY: SpaceVisibility = "INTERNAL";

export function NewSpaceView() {
  const router = useRouter();
  const { mutate, isPending } = useSpaceCreate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<SpaceVisibility>(DEFAULT_VISIBILITY);

  function handleVisibilityChange(value: string | null) {
    if (value !== null && isSpaceVisibility(value)) setVisibility(value);
  }

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const canSubmit = trimmedName !== "" && trimmedDescription !== "" && !isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    mutate(
      { name: trimmedName, description: trimmedDescription, visibility },
      {
        onSuccess: (result) => {
          const spaceId = asSpaceId(result.spaceId);
          router.push(`/pages/new?spaceId=${encodeURIComponent(spaceId)}`);
        },
        onError: (mutationError) => {
          // 401 INVALID_SESSION 은 providers.tsx 의 MutationCache.onError 가 글로벌 redirect 를 담당.
          // 여기서는 toast 중복만 막는다.
          if (mutationError.status === 401 && mutationError.code === "INVALID_SESSION") return;
          toast.error(toUserMessage(mutationError));
        },
      },
    );
  }

  return (
    // noValidate: HTML 단 validation 을 끄고 canSubmit/JS 가드 한 곳으로 일관.
    // 필드의 `required` 는 a11y/시각 표시용으로만 유지.
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10"
      noValidate
    >
      <h1 className="text-2xl font-semibold">새 스페이스</h1>

      <div className="space-y-2">
        <Label htmlFor="new-space-name">이름</Label>
        <Input
          id="new-space-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
          required
          placeholder="예: 디자인 시스템"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-space-description">설명</Label>
        <Textarea
          id="new-space-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isPending}
          required
          placeholder="이 스페이스가 무엇을 담을지 한 줄로 적어 주세요."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="new-space-visibility-trigger"
          className="text-muted-foreground text-xs uppercase"
        >
          공개 범위
        </Label>
        <Select value={visibility} onValueChange={handleVisibilityChange} disabled={isPending}>
          <SelectTrigger id="new-space-visibility-trigger" aria-label="공개 범위">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPACE_VISIBILITY_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {spaceVisibilityLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{spaceVisibilityDescription(visibility)}</p>
      </div>

      <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? "만드는 중..." : "만들기"}
        </Button>
      </div>
    </form>
  );
}
