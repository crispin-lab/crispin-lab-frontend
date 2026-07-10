"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeading } from "@/components/PageHeading";
import { StickyFormFooter } from "@/components/page/StickyFormFooter";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSpaceDetail, useSpaceEdit } from "@/hooks/useSpace";
import { ApiError } from "@/lib/api/client";
import { toUserMessage } from "@/lib/api/errors";
import type { SpaceId } from "@/lib/api/ids";
import type { Space, SpaceEditRequest } from "@/lib/api/types";
import {
  SPACE_VISIBILITY_VALUES,
  type SpaceVisibility,
  isSpaceVisibility,
  spaceVisibilityDescription,
  spaceVisibilityLabel,
} from "@/lib/space/visibility";

// 백엔드 도메인 검증 (Space.MAX_NAME_LENGTH / MAX_DESCRIPTION_LENGTH) 과 정합.
const SPACE_NAME_MAX_LENGTH = 100;
const SPACE_DESCRIPTION_MAX_LENGTH = 500;

type Props = {
  spaceId: SpaceId;
  initialSpace?: Space;
};

export function SpaceEditView({ spaceId, initialSpace }: Props) {
  const {
    data: space,
    isPending,
    isError,
    error,
  } = useSpaceDetail(spaceId, {
    initialData: initialSpace,
    refetchOnMount: "always",
  });

  if (isPending) {
    return <SpaceEditSkeleton />;
  }
  if (isError) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    return (
      <p role="alert" className="text-destructive">
        {toUserMessage(error)}
      </p>
    );
  }

  // OpenAPI 산출 union 이 넓어져 새 값이 흘러올 경우 대비 — 사용자 저장 시 서버가 최종 검증.
  const initialVisibility: SpaceVisibility = isSpaceVisibility(space.visibility)
    ? space.visibility
    : "INTERNAL";

  return (
    <SpaceEditForm
      spaceId={spaceId}
      initialName={space.name}
      initialDescription={space.description}
      initialVisibility={initialVisibility}
    />
  );
}

type FormProps = {
  spaceId: SpaceId;
  initialName: string;
  initialDescription: string;
  initialVisibility: SpaceVisibility;
};

function SpaceEditForm({ spaceId, initialName, initialDescription, initialVisibility }: FormProps) {
  const router = useRouter();
  const [baselineName, setBaselineName] = useState(initialName);
  const [baselineDescription, setBaselineDescription] = useState(initialDescription);
  const [baselineVisibility, setBaselineVisibility] = useState<SpaceVisibility>(initialVisibility);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState<SpaceVisibility>(initialVisibility);

  const { mutate, isPending, error } = useSpaceEdit(spaceId);

  function handleVisibilityChange(next: string | null) {
    if (next !== null && isSpaceVisibility(next)) setVisibility(next);
  }

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const baselineTrimmedName = baselineName.trim();
  const baselineTrimmedDescription = baselineDescription.trim();

  const isNameDirty = trimmedName !== baselineTrimmedName;
  const isDescriptionDirty = trimmedDescription !== baselineTrimmedDescription;
  const isVisibilityDirty = visibility !== baselineVisibility;
  const hasDirty = isNameDirty || isDescriptionDirty || isVisibilityDirty;
  const canSubmit = hasDirty && trimmedName !== "" && !isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const body: SpaceEditRequest = {};
    if (isNameDirty) body.name = trimmedName;
    if (isDescriptionDirty) body.description = trimmedDescription;
    if (isVisibilityDirty) body.visibility = visibility;

    mutate(body, {
      onSuccess: () => {
        if (isNameDirty) setBaselineName(trimmedName);
        if (isDescriptionDirty) setBaselineDescription(trimmedDescription);
        if (isVisibilityDirty) setBaselineVisibility(visibility);
        toast.success("저장했어요", {
          id: `space-edit-save-${spaceId}`,
          action: {
            label: "스페이스로 이동",
            onClick: () => router.push(`/spaces/${encodeURIComponent(spaceId)}`),
          },
        });
      },
    });
  }

  const isGloballyHandledError = error instanceof ApiError && error.status === 401;
  const errorMessage = error != null && !isGloballyHandledError ? toUserMessage(error) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10"
      noValidate
    >
      <PageHeading>스페이스 편집</PageHeading>

      {errorMessage !== null && (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="space-edit-name" className="text-muted-foreground text-xs uppercase">
          이름
        </Label>
        <TitleInput
          id="space-edit-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
          placeholder="예: 디자인 시스템"
          maxLength={SPACE_NAME_MAX_LENGTH}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="space-edit-description" className="text-muted-foreground text-xs uppercase">
          설명
        </Label>
        <Textarea
          id="space-edit-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isPending}
          placeholder="이 스페이스가 무엇을 담을지 한 줄로 적어 주세요."
          rows={3}
          maxLength={SPACE_DESCRIPTION_MAX_LENGTH}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="space-edit-visibility-trigger"
          className="text-muted-foreground text-xs uppercase"
        >
          공개 범위
        </Label>
        <Select value={visibility} onValueChange={handleVisibilityChange} disabled={isPending}>
          <SelectTrigger id="space-edit-visibility-trigger" aria-label="공개 범위">
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

      <StickyFormFooter>
        {isPending ? (
          <Button type="button" variant="outline" disabled>
            편집 완료
          </Button>
        ) : (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/spaces/${encodeURIComponent(spaceId)}`}>편집 완료</Link>}
          />
        )}
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? "저장 중…" : "저장"}
        </Button>
      </StickyFormFooter>
    </form>
  );
}

function SpaceEditSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
