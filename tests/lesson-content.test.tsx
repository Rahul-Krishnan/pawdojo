import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push: vi.fn(), refresh: vi.fn() }),
}));

// SessionLogForm (rendered inside LessonContent) calls these.
vi.mock("@/app/actions/log-session", () => ({
  logSession: vi.fn().mockResolvedValue({ success: true, xpAwarded: 0, achievementsUnlocked: [] }),
}));

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
  playSuccess: vi.fn(),
  playXpEarned: vi.fn(),
  playBadgeUnlock: vi.fn(),
}));

import { LessonContent, SessionRecord } from "@/components/lesson/lesson-content";

function renderContent(props: Partial<React.ComponentProps<typeof LessonContent>> = {}) {
  return render(
    <LessonContent
      lessonId="l1"
      skillId="s1"
      skillName="Sit"
      title="Sit Basics"
      contentMd={"## How to teach sit\n\nHold a treat above the nose."}
      xpReward={10}
      isCompleted={false}
      {...props}
    />
  );
}

describe("LessonContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the title, skill name and markdown content", () => {
    renderContent();
    expect(screen.getByRole("heading", { name: "Sit Basics" })).toBeInTheDocument();
    expect(screen.getByText("Sit")).toBeInTheDocument();
    expect(screen.getByText("How to teach sit")).toBeInTheDocument();
    expect(screen.getByText("Hold a treat above the nose.")).toBeInTheDocument();
  });

  it("calls router.back when the Back button is pressed", () => {
    renderContent();
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("shows a completed badge with the practice count when isCompleted", () => {
    const sessions: SessionRecord[] = [
      { id: "x1", rating: 5, notes: null, loggedAt: "2026-01-01T00:00:00Z", reps: 5, durationMin: 5 },
      { id: "x2", rating: 4, notes: null, loggedAt: "2026-01-02T00:00:00Z", reps: 8, durationMin: 5 },
    ];
    renderContent({ isCompleted: true, sessions });
    expect(screen.getByText("Practiced 2 times")).toBeInTheDocument();
  });

  it("does not render the session history section when there are no sessions", () => {
    renderContent({ sessions: [] });
    expect(screen.queryByText(/Session History \(/)).not.toBeInTheDocument();
  });

  it("toggles the collapsible session history open", () => {
    const sessions: SessionRecord[] = [
      { id: "x1", rating: 5, notes: "nice", loggedAt: "2026-01-01T00:00:00Z", reps: 5, durationMin: 5 },
    ];
    renderContent({ sessions });
    expect(screen.getByText("Session History (1)")).toBeInTheDocument();
    expect(screen.queryByText("nice")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Session History (1)"));
    expect(screen.getByText("nice")).toBeInTheDocument();
  });

  it("renders the embedded session log form", () => {
    renderContent();
    expect(screen.getByText("Log Training")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I trained my dog/ })).toBeInTheDocument();
  });
});
