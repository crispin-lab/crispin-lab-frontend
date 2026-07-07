import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormattedTime } from "./FormattedTime";

const SAMPLE_ISO = "2026-07-07T15:30:00Z";

describe("FormattedTime", () => {
  it("mount 이후 로컬 timezone 으로 date variant 를 포맷한다", () => {
    const { container } = render(<FormattedTime iso={SAMPLE_ISO} />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time?.getAttribute("datetime")).toBe(SAMPLE_ISO);
    const expected = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(SAMPLE_ISO));
    expect(time?.textContent).toBe(expected);
  });

  it("datetime variant 는 시각까지 포함해 포맷한다", () => {
    const { container } = render(<FormattedTime iso={SAMPLE_ISO} variant="datetime" />);
    const expected = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(SAMPLE_ISO));
    expect(container.querySelector("time")?.textContent).toBe(expected);
  });

  it("tabular-nums className 을 항상 붙이고 외부 className 을 뒤에 머지한다", () => {
    const { container } = render(
      <FormattedTime iso={SAMPLE_ISO} className="text-muted-foreground" />,
    );
    const time = container.querySelector("time");
    expect(time?.className).toContain("tabular-nums");
    expect(time?.className).toContain("text-muted-foreground");
  });

  it("유효하지 않은 ISO 문자열은 원문을 그대로 노출한다", () => {
    const { container } = render(<FormattedTime iso="not-a-date" />);
    expect(container.querySelector("time")?.textContent).toBe("not-a-date");
  });

  it("iso 가 바뀌면 다음 렌더에서 새 값으로 갱신된다", () => {
    const first = "2026-07-07T00:00:00Z";
    const second = "2027-01-15T00:00:00Z";
    const { container, rerender } = render(<FormattedTime iso={first} />);
    const timeBefore = container.querySelector("time")?.textContent;
    expect(timeBefore).toMatch(/2026/);
    rerender(<FormattedTime iso={second} />);
    const timeAfter = container.querySelector("time")?.textContent;
    expect(timeAfter).toMatch(/2027/);
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe(second);
  });

  it("SSR 렌더 결과에는 dateTime 만 노출하고 layout 예약용 invisible placeholder 로 폭을 잡는다", () => {
    const html = renderToString(<FormattedTime iso={SAMPLE_ISO} />);
    expect(html).toMatch(new RegExp(`dateTime="${SAMPLE_ISO}"`, "i"));
    expect(html).toContain("tabular-nums");
    expect(html).toMatch(
      /<span[^>]*aria-hidden[^>]*class="[^"]*invisible[^"]*"[^>]*>0000\. 00\. 00\.<\/span>/,
    );
  });

  it("SSR 렌더의 datetime variant 는 시각까지 포함한 placeholder 를 사용한다", () => {
    const html = renderToString(<FormattedTime iso={SAMPLE_ISO} variant="datetime" />);
    expect(html).toContain("0000. 00. 00. 00:00");
  });
});
