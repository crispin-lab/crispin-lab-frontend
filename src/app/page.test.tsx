import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home (smoke)", () => {
  it("홈 헤딩을 렌더한다", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "crispin-lab" })).toBeInTheDocument();
  });
});
