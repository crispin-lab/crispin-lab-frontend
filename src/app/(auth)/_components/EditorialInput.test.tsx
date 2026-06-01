import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorialInput } from "./EditorialInput";

describe("EditorialInput", () => {
  it("호출부의 aria-invalid 가 input element 에 전파된다", () => {
    render(<EditorialInput aria-invalid />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("호출부의 disabled 가 input element 에 전파된다", () => {
    render(<EditorialInput disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("호출부의 className 이 base 와 머지된다 (override 가능)", () => {
    render(<EditorialInput className="custom-test-class" />);
    expect(screen.getByRole("textbox").className).toMatch(/custom-test-class/);
  });
});
