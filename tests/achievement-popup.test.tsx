import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AchievementPopup } from "@/components/lesson/achievement-popup";

describe("AchievementPopup", () => {
  it("renders nothing when there are no achievements", () => {
    const { container } = render(
      <AchievementPopup achievements={[]} onDone={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each unlocked achievement name", () => {
    render(
      <AchievementPopup
        achievements={["First Steps", "Streak Master"]}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByText("Award Earned!")).toBeInTheDocument();
    expect(screen.getByText("First Steps")).toBeInTheDocument();
    expect(screen.getByText("Streak Master")).toBeInTheDocument();
  });

  it("calls onDone when the Awesome button is clicked", () => {
    const onDone = vi.fn();
    render(<AchievementPopup achievements={["First Steps"]} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Awesome!" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
