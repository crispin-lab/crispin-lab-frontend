import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import type { Space } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { spaceBody } from "@/test/fixtures/space";
import { spaceAuditEntry, spaceAuditListBody } from "@/test/fixtures/spaceAudit";
import { createQueryWrapper } from "@/test/queryWrapper";

const { notFoundMock } = vi.hoisted(() => ({ notFoundMock: vi.fn() }));

let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  notFound: notFoundMock,
}));

import { SpaceAuditLogView } from "./SpaceAuditLogView";

const SPACE_ID_RAW = "s_1";
const SPACE_ID = asSpaceId(SPACE_ID_RAW);

function testSpace(overrides: Partial<Space> = {}): Space {
  return spaceBody({ spaceId: SPACE_ID_RAW, name: "테스트 스페이스", ...overrides });
}

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  notFoundMock.mockClear();
});

describe("SpaceAuditLogView", () => {
  it("빈 이력이면 안내 문구를 노출", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/audit-entries`, () =>
        HttpResponse.json(spaceAuditListBody([])),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceAuditLogView spaceId={SPACE_ID} space={testSpace()} />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 편집 이력이 없습니다.")).toBeInTheDocument();
  });

  it("entry 마다 action chip · 사용자 handle · changeSummary 조립 결과가 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/audit-entries`, () =>
        HttpResponse.json(
          spaceAuditListBody([
            spaceAuditEntry({
              id: "sae_1",
              action: "EDITED",
              actorHandle: "crispin",
              changeSummary: JSON.stringify({
                name: { before: "예전 스페이스", after: "새 스페이스" },
              }),
            }),
            spaceAuditEntry({
              id: "sae_2",
              action: "REGISTERED",
              actorHandle: "tester",
              changeSummary: JSON.stringify({
                name: "예전 스페이스",
                description: "",
                visibility: "PUBLIC",
              }),
            }),
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceAuditLogView spaceId={SPACE_ID} space={testSpace()} />, { wrapper: Wrapper });

    expect(
      await screen.findByText(/이름을 “예전 스페이스” → “새 스페이스”로 변경/),
    ).toBeInTheDocument();
    expect(screen.getByText(/이름: 예전 스페이스/)).toBeInTheDocument();
    expect(screen.getByText("@crispin")).toBeInTheDocument();
    expect(screen.getByText("@tester")).toBeInTheDocument();
    // action chip aria-label 로 접근성 확인.
    expect(screen.getByLabelText("변경 유형: 수정")).toBeInTheDocument();
    expect(screen.getByLabelText("변경 유형: 등록")).toBeInTheDocument();
  });

  it("actorHandle 빈 문자열은 이탤릭 '삭제된 사용자' fallback", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/audit-entries`, () =>
        HttpResponse.json(
          spaceAuditListBody([spaceAuditEntry({ actorHandle: "", action: "EDITED" })]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceAuditLogView spaceId={SPACE_ID} space={testSpace()} />, { wrapper: Wrapper });

    const fallback = await screen.findByText("삭제된 사용자");
    expect(fallback).toBeInTheDocument();
    expect(fallback.tagName).toBe("SPAN");
    expect(fallback.className).toContain("italic");
  });

  it("돌아가기 링크가 스페이스 이름과 함께 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/audit-entries`, () =>
        HttpResponse.json(spaceAuditListBody([])),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceAuditLogView spaceId={SPACE_ID} space={testSpace({ name: "공개 위키" })} />, {
      wrapper: Wrapper,
    });

    const link = await screen.findByRole("link", { name: /공개 위키/ });
    expect(link).toHaveAttribute("href", `/spaces/${SPACE_ID_RAW}`);
  });

  it("totalPages > 1 이면 페이징 nav 가 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/audit-entries`, () =>
        HttpResponse.json(
          spaceAuditListBody([spaceAuditEntry()], { totalPages: 3, totalElements: 55 }),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceAuditLogView spaceId={SPACE_ID} space={testSpace()} />, { wrapper: Wrapper });

    expect(
      await screen.findByRole("navigation", { name: "편집 이력 페이지 이동" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("403 응답은 notFound() 로 흡수 — 권한 revoke race 안전망", async () => {
    server.use(
      http.get(`*/api/v1/spaces/${SPACE_ID_RAW}/audit-entries`, () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "권한 없음" }, { status: 403 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceAuditLogView spaceId={SPACE_ID} space={testSpace()} />, { wrapper: Wrapper });

    await waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });
});
