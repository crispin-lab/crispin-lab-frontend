import { render } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { TaskItemSaveMounter } from "./TaskItemSaveMounter";

// usePageUpdate (TanStack Query mutation) 를 사용하므로 QueryClientProvider 가 필요 — handleMutationError 도 같이 묶여 들어와 글로벌 정책 검증.
function renderWithClient(node: ReactElement) {
  const { Wrapper } = createQueryWrapper();
  return render(node, { wrapper: Wrapper });
}

const INITIAL = {
  type: "doc",
  content: [
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
        },
      ],
    },
  ],
};

function bodyHtml() {
  // viewer HTML 의 핵심 모양 — TaskItem 의 native renderHTML 산출과 동일 구조 (li[data-type=taskItem] > label > input).
  return `
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>B</p></div></li>
    </ul>
  `;
}

describe("TaskItemSaveMounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("enabled=false 면 체크박스가 disabled 되어 클릭 자체가 불가", async () => {
    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={INITIAL}
        enabled={false}
      >
        <div dangerouslySetInnerHTML={{ __html: bodyHtml() }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => {
      expect(input.disabled).toBe(true);
    });
  });

  it("enabled=false 면 PUT 이 발생하지 않는다", async () => {
    let putCalled = false;
    server.use(
      http.put("*/api/v1/pages/:id", () => {
        putCalled = true;
        return HttpResponse.json({});
      }),
    );

    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={INITIAL}
        enabled={false}
      >
        <div dangerouslySetInnerHTML={{ __html: bodyHtml() }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    inputs[0].checked = true;
    inputs[0].dispatchEvent(new Event("change", { bubbles: true }));

    await vi.advanceTimersByTimeAsync(1000);
    expect(putCalled).toBe(false);
  });

  it("체크박스 변경 시 데이터 변환 후 PUT 을 보낸다 (debounce 500ms)", async () => {
    let requestBody: { content?: string } | null = null;
    server.use(
      http.put("*/api/v1/pages/:id", async ({ request }) => {
        requestBody = (await request.json()) as { content: string };
        return HttpResponse.json({});
      }),
    );

    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={INITIAL}
        enabled={true}
      >
        <div dangerouslySetInnerHTML={{ __html: bodyHtml() }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    // 두 번째 아이템 (B) 만 체크
    inputs[1].checked = true;
    inputs[1].dispatchEvent(new Event("change", { bubbles: true }));

    // 디바운스 윈도우 안에는 아직 PUT 안 됨
    await vi.advanceTimersByTimeAsync(400);
    expect(requestBody).toBeNull();

    // 500ms 도달 후 PUT 발생
    await vi.advanceTimersByTimeAsync(200);
    expect(requestBody).not.toBeNull();
    const parsed = JSON.parse((requestBody as unknown as { content: string }).content);
    expect(parsed.content[0].content[0].attrs.checked).toBe(false);
    expect(parsed.content[0].content[1].attrs.checked).toBe(true);
  });

  it("연속 클릭은 마지막 상태만 한 번의 PUT 으로 합쳐진다", async () => {
    const putCalls: { content: string }[] = [];
    server.use(
      http.put("*/api/v1/pages/:id", async ({ request }) => {
        putCalls.push((await request.json()) as { content: string });
        return HttpResponse.json({});
      }),
    );

    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={INITIAL}
        enabled={true}
      >
        <div dangerouslySetInnerHTML={{ __html: bodyHtml() }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    inputs[0].checked = true;
    inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(100);
    inputs[1].checked = true;
    inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(600);

    expect(putCalls).toHaveLength(1);
    const parsed = JSON.parse(putCalls[0].content);
    expect(parsed.content[0].content[0].attrs.checked).toBe(true);
    expect(parsed.content[0].content[1].attrs.checked).toBe(true);
  });

  it("부모 체크 시 자식 체크박스까지 cascade 되어 DOM input.checked / data-checked / JSON 이 동기된다", async () => {
    let requestBody: { content?: string } | null = null;
    server.use(
      http.put("*/api/v1/pages/:id", async ({ request }) => {
        requestBody = (await request.json()) as { content: string };
        return HttpResponse.json({});
      }),
    );

    const nestedInitial = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "parent" }] },
                {
                  type: "taskList",
                  content: [
                    {
                      type: "taskItem",
                      attrs: { checked: false },
                      content: [{ type: "paragraph", content: [{ type: "text", text: "child" }] }],
                    },
                    {
                      type: "taskItem",
                      attrs: { checked: false },
                      content: [{ type: "paragraph", content: [{ type: "text", text: "child2" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const nestedHtml = `
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">
          <label><input type="checkbox"><span></span></label>
          <div>
            <p>parent</p>
            <ul data-type="taskList">
              <li data-type="taskItem" data-checked="false">
                <label><input type="checkbox"><span></span></label>
                <div><p>child</p></div>
              </li>
              <li data-type="taskItem" data-checked="false">
                <label><input type="checkbox"><span></span></label>
                <div><p>child2</p></div>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    `;

    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={nestedInitial}
        enabled={true}
      >
        <div dangerouslySetInnerHTML={{ __html: nestedHtml }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    inputs[0].checked = true;
    inputs[0].dispatchEvent(new Event("change", { bubbles: true }));

    const allLi = container.querySelectorAll<HTMLLIElement>('li[data-type="taskItem"]');
    expect(allLi[0].getAttribute("data-checked")).toBe("true");
    expect(allLi[1].getAttribute("data-checked")).toBe("true");
    expect(allLi[2].getAttribute("data-checked")).toBe("true");
    expect(inputs[1].checked).toBe(true);
    expect(inputs[2].checked).toBe(true);

    await vi.advanceTimersByTimeAsync(600);
    expect(requestBody).not.toBeNull();
    const parsed = JSON.parse((requestBody as unknown as { content: string }).content);
    const parent = parsed.content[0].content[0];
    const childList = parent.content[1];
    expect(parent.attrs.checked).toBe(true);
    expect(childList.content[0].attrs.checked).toBe(true);
    expect(childList.content[1].attrs.checked).toBe(true);
  });

  it("자식 체크 시 자기 자신만 업데이트되고 부모는 unchanged", async () => {
    let requestBody: { content?: string } | null = null;
    server.use(
      http.put("*/api/v1/pages/:id", async ({ request }) => {
        requestBody = (await request.json()) as { content: string };
        return HttpResponse.json({});
      }),
    );

    const nestedInitial = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "parent" }] },
                {
                  type: "taskList",
                  content: [
                    {
                      type: "taskItem",
                      attrs: { checked: false },
                      content: [{ type: "paragraph", content: [{ type: "text", text: "child" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const nestedHtml = `
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">
          <label><input type="checkbox"><span></span></label>
          <div>
            <p>parent</p>
            <ul data-type="taskList">
              <li data-type="taskItem" data-checked="false">
                <label><input type="checkbox"><span></span></label>
                <div><p>child</p></div>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    `;

    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={nestedInitial}
        enabled={true}
      >
        <div dangerouslySetInnerHTML={{ __html: nestedHtml }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    inputs[1].checked = true;
    inputs[1].dispatchEvent(new Event("change", { bubbles: true }));

    const allLi = container.querySelectorAll<HTMLLIElement>('li[data-type="taskItem"]');
    expect(allLi[0].getAttribute("data-checked")).toBe("false");
    expect(allLi[1].getAttribute("data-checked")).toBe("true");

    await vi.advanceTimersByTimeAsync(600);
    const parsed = JSON.parse((requestBody as unknown as { content: string }).content);
    const parent = parsed.content[0].content[0];
    const child = parent.content[1].content[0];
    expect(parent.attrs.checked).toBe(false);
    expect(child.attrs.checked).toBe(true);
  });

  it("PUT 직후 DOM 의 data-checked attribute 도 사용자가 토글한 input 상태와 일치", async () => {
    server.use(http.put("*/api/v1/pages/:id", () => HttpResponse.json({})));

    const { container } = renderWithClient(
      <TaskItemSaveMounter
        pageId={asPageId("p_1")}
        title="t"
        visibility="DRAFT"
        initialContent={INITIAL}
        enabled={true}
      >
        <div dangerouslySetInnerHTML={{ __html: bodyHtml() }} />
      </TaskItemSaveMounter>,
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    inputs[0].checked = true;
    inputs[0].dispatchEvent(new Event("change", { bubbles: true }));

    const li = container.querySelectorAll<HTMLLIElement>('li[data-type="taskItem"]');
    expect(li[0].getAttribute("data-checked")).toBe("true");
    expect(li[1].getAttribute("data-checked")).toBe("false");
  });
});
