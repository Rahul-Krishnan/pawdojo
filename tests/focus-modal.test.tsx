import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { FocusModal } from "@/components/dashboard/focus-modal";

describe("FocusModal", () => {
  it("renders current and best focus values", () => {
    render(
      <FocusModal
        currentStreak={5}
        longestStreak={12}
        freezeAvailable={0}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Current Focus")).toBeInTheDocument();
    expect(screen.getByText("Best Focus")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("hides the saves row when no freezes are available", () => {
    render(
      <FocusModal
        currentStreak={5}
        longestStreak={12}
        freezeAvailable={0}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText("Saves Remaining")).not.toBeInTheDocument();
  });

  it("shows the saves row when freezes are available", () => {
    render(
      <FocusModal
        currentStreak={5}
        longestStreak={12}
        freezeAvailable={2}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Saves Remaining")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onClose when Done is clicked", () => {
    const onClose = vi.fn();
    render(
      <FocusModal
        currentStreak={0}
        longestStreak={0}
        freezeAvailable={0}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
