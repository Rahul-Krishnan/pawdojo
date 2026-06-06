import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SessionCard } from "@/components/shared/session-card";

describe("SessionCard", () => {
  it("renders the skill name and notes", () => {
    render(
      <SessionCard
        skillName="Sit"
        rating={4}
        reps={8}
        durationMin={5}
        notes="great boy"
        loggedAt="2026-01-15T10:00:00.000Z"
      />
    );
    expect(screen.getByText("Sit")).toBeInTheDocument();
    expect(screen.getByText("great boy")).toBeInTheDocument();
    expect(screen.getByText(/8\+ reps/)).toBeInTheDocument();
    expect(screen.getByText(/5 min/)).toBeInTheDocument();
  });

  it("omits the reps/duration line when both are absent", () => {
    render(
      <SessionCard
        skillName="Stay"
        rating={3}
        reps={null}
        durationMin={null}
        notes={null}
        loggedAt="2026-01-15T10:00:00.000Z"
      />
    );
    expect(screen.queryByText(/reps/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
  });

  it("renders as a plain div when no href is provided", () => {
    render(<SessionCard skillName="Sit" rating={5} loggedAt="2026-01-15T10:00:00.000Z" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as a link when an href is provided", () => {
    render(
      <SessionCard
        skillName="Sit"
        rating={5}
        loggedAt="2026-01-15T10:00:00.000Z"
        href="/lesson/l1"
      />
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/lesson/l1");
  });
});
