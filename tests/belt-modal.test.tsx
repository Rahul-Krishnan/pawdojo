import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { BeltProgressionModal } from "@/components/dashboard/belt-modal";
import { getBelt } from "@/lib/gamification/xp";

describe("BeltProgressionModal", () => {
  it("renders the title and total XP earned", () => {
    render(<BeltProgressionModal currentLevel={3} totalXp={1234} onClose={vi.fn()} />);
    expect(screen.getByText("Belt Progression")).toBeInTheDocument();
    expect(screen.getByText("1,234 XP earned total")).toBeInTheDocument();
  });

  it("lists every belt and marks the current one with a YOU badge", () => {
    render(<BeltProgressionModal currentLevel={3} totalXp={1234} onClose={vi.fn()} />);
    // White (lvl 0) and Yellow (lvl 2) are earned at level 3; Yellow is current.
    expect(screen.getByText("White Belt")).toBeInTheDocument();
    expect(screen.getByText("Yellow Belt")).toBeInTheDocument();
    expect(screen.getByText("Black Belt")).toBeInTheDocument();
    expect(getBelt(3).name).toBe("Yellow Belt");
    expect(screen.getByText("YOU")).toBeInTheDocument();
  });

  it("calls onClose when the Done button is clicked", () => {
    const onClose = vi.fn();
    render(<BeltProgressionModal currentLevel={0} totalXp={0} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked but not the panel", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BeltProgressionModal currentLevel={0} totalXp={0} onClose={onClose} />
    );
    // clicking inside the panel content should not close (panel stops propagation)
    fireEvent.click(screen.getByText("Belt Progression"));
    expect(onClose).not.toHaveBeenCalled();

    // clicking the backdrop (the outermost overlay wrapper) should close
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
