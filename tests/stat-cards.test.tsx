import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
}));

import { BeltStatCard } from "@/components/dashboard/belt-stat-card";
import { XpStatCard } from "@/components/dashboard/xp-stat-card";
import { FocusStatCard } from "@/components/dashboard/focus-stat-card";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { FocusModal } from "@/components/dashboard/focus-modal";
import { XpDisplay } from "@/components/dashboard/xp-display";
import { getBelt } from "@/lib/gamification/xp";

describe("BeltStatCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the belt name without the 'Belt' suffix", () => {
    render(<BeltStatCard currentLevel={3} totalXp={500} />);
    // getBelt(3) -> "Yellow Belt", card strips " Belt"
    expect(getBelt(3).name).toBe("Yellow Belt");
    expect(screen.getByText("Yellow")).toBeInTheDocument();
    expect(screen.getByText("Belt")).toBeInTheDocument(); // the label
  });

  it("opens the belt progression modal when clicked", () => {
    render(<BeltStatCard currentLevel={3} totalXp={500} />);
    expect(screen.queryByText("Belt Progression")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Belt Progression")).toBeInTheDocument();
  });
});

describe("XpStatCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the total XP and label", () => {
    render(<XpStatCard totalXp={420} currentLevel={2} />);
    expect(screen.getByText("420")).toBeInTheDocument();
    expect(screen.getByText("Total XP")).toBeInTheDocument();
  });

  it("opens the XP progress modal when clicked", () => {
    render(<XpStatCard totalXp={420} currentLevel={2} />);
    expect(screen.queryByText("XP Progress")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("XP Progress")).toBeInTheDocument();
  });
});

describe("FocusStatCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the longest streak as the best focus value", () => {
    render(<FocusStatCard currentStreak={3} longestStreak={9} freezeAvailable={0} />);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("Best Focus")).toBeInTheDocument();
  });

  it("opens the focus modal when clicked", () => {
    render(<FocusStatCard currentStreak={3} longestStreak={9} freezeAvailable={1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Current Focus")).toBeInTheDocument();
  });
});

describe("StreakDisplay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the current streak and pluralized focus label", () => {
    render(<StreakDisplay currentStreak={7} longestStreak={10} freezeAvailable={0} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("days focus")).toBeInTheDocument();
  });

  it("uses the singular focus label when the streak is one day", () => {
    render(<StreakDisplay currentStreak={1} longestStreak={10} freezeAvailable={0} />);
    expect(screen.getByText("day focus")).toBeInTheDocument();
  });

  it("shows the saves remaining line including the zero state", () => {
    const { rerender } = render(
      <StreakDisplay currentStreak={7} longestStreak={10} freezeAvailable={0} />
    );
    expect(screen.getByText("No saves remaining")).toBeInTheDocument();

    rerender(<StreakDisplay currentStreak={7} longestStreak={10} freezeAvailable={1} />);
    expect(screen.getByText("1 save remaining")).toBeInTheDocument();

    rerender(<StreakDisplay currentStreak={7} longestStreak={10} freezeAvailable={2} />);
    expect(screen.getByText("2 saves remaining")).toBeInTheDocument();
  });

  it("opens the focus modal when clicked", () => {
    render(<StreakDisplay currentStreak={7} longestStreak={10} freezeAvailable={0} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Best Focus")).toBeInTheDocument();
  });
});

describe("FocusModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pluralizes the day units independently for current and best focus", () => {
    render(
      <FocusModal currentStreak={1} longestStreak={5} freezeAvailable={0} onClose={() => {}} />
    );
    // Current Focus is 1 -> singular, Best Focus is 5 -> plural.
    expect(screen.getByText("day")).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();
  });

  it("uses the plural unit for a zero streak", () => {
    render(
      <FocusModal currentStreak={0} longestStreak={0} freezeAvailable={0} onClose={() => {}} />
    );
    expect(screen.getAllByText("days")).toHaveLength(2);
    expect(screen.queryByText("day")).not.toBeInTheDocument();
  });
});

describe("XpDisplay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the current belt name and total XP", () => {
    render(<XpDisplay totalXp={500} currentLevel={3} />);
    expect(screen.getByText(getBelt(3).name)).toBeInTheDocument();
    expect(screen.getByText("500 XP")).toBeInTheDocument();
  });

  it("opens the belt progression modal when clicked", () => {
    render(<XpDisplay totalXp={500} currentLevel={3} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Belt Progression")).toBeInTheDocument();
  });
});
